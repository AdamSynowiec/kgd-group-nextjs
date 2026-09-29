<?php

declare(strict_types=1);

namespace App\Support;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Walidacja i treść maili z formularzy strony — te same reguły co w
 * przeglądarce (src/components/shared/Contact.tsx i CallToUs.tsx), bo
 * walidacji po stronie przeglądarki nie da się ufać. Czyste funkcje bez
 * I/O, żeby dało się je testować (backend/tests/ContactFormTest.php).
 */
final class ContactForm
{
    /** Kod kraju => liczba cyfr numeru bez prefiksu — kopia listy phoneCountries z Contact.tsx/CallToUs.tsx. */
    public const PHONE_COUNTRIES = [
        'PL' => ['+48', 9],
        'DE' => ['+49', 11],
        'CZ' => ['+420', 9],
        'SK' => ['+421', 9],
        'UA' => ['+380', 9],
        'BY' => ['+375', 9],
        'LT' => ['+370', 8],
        'RU' => ['+7', 10],
    ];

    private const MAX_MESSAGE = 5000;

    /**
     * Pole-pułapka "address" jest w formularzu ukryte (display:none) — człowiek go
     * nie widzi i nie wypełnia, boty wypełniają wszystko.
     *
     * @param array<string, mixed> $body
     */
    public static function isSpam(array $body): bool
    {
        return is_string($body['address'] ?? null) && trim($body['address']) !== '';
    }

    /**
     * @param array<string, mixed> $body
     * @return array{0: array<string, string>, 1: array{name: string, email: string, phone: string, subject: string, message: string}}
     *         [błędy per pole, znormalizowane dane]
     */
    public static function validateContact(array $body): array
    {
        $errors = [];

        $name = self::text($body, 'name', 120, $errors);
        $subject = self::text($body, 'subject', 200, $errors);
        $message = self::text($body, 'message', self::MAX_MESSAGE, $errors, multiline: true);

        $email = self::text($body, 'email', 254, $errors);
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $errors['email'] = 'Invalid e-mail address';
        }

        $phone = self::phone($body, $errors);

        foreach (['consent', 'consentEmail', 'consentPhone'] as $consent) {
            if (($body[$consent] ?? false) !== true) {
                $errors[$consent] = 'Consent is required';
            }
        }

        return [$errors, compact('name', 'email', 'phone', 'subject', 'message')];
    }

    /**
     * @param array<string, mixed> $body
     * @return array{0: array<string, string>, 1: array{phone: string, site: string}}
     */
    public static function validateQuickContact(array $body): array
    {
        $errors = [];
        $phone = self::phone($body, $errors);

        if (($body['consent'] ?? false) !== true) {
            $errors['consent'] = 'Consent is required';
        }

        // Adres podstrony, z której przyszło zgłoszenie — tylko informacyjnie w mailu.
        $site = is_string($body['site'] ?? null) ? trim($body['site']) : '';
        if ($site !== '' && (strlen($site) > 500 || preg_match('~^https?://\S+$~i', $site) !== 1)) {
            $site = '';
        }

        return [$errors, compact('phone', 'site')];
    }

    /**
     * Czy adres wskazany przez stronę (pole "target" — e-mail kontaktowy danej
     * inwestycji) może być odbiorcą. Tylko adresy/domeny z CONTACT_ALLOWED_TARGETS —
     * inaczej formularz dałoby się użyć do wysyłania maili na dowolny adres.
     *
     * @param list<string> $allowed pełne adresy albo domeny zapisane jako "@domena.pl"
     */
    public static function isAllowedTarget(string $target, array $allowed): bool
    {
        $target = strtolower(trim($target));
        if (filter_var($target, FILTER_VALIDATE_EMAIL) === false) {
            return false;
        }

        $domain = substr($target, (int) strrpos($target, '@'));
        foreach ($allowed as $entry) {
            $entry = strtolower(trim($entry));
            if ($entry !== '' && ($entry === $target || $entry === $domain)) {
                return true;
            }
        }

        return false;
    }

    /** @return list<string> */
    public static function parseList(string $value): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $value)), static fn (string $v): bool => $v !== ''));
    }

    /** @param array{name: string, email: string, phone: string, subject: string, message: string} $data */
    public static function contactBody(array $data, string $page): string
    {
        return implode("\n", [
            'Nowa wiadomość z formularza kontaktowego.',
            '',
            'Imię i nazwisko: ' . $data['name'],
            'E-mail: ' . $data['email'],
            'Telefon: ' . $data['phone'],
            'Temat: ' . $data['subject'],
            '',
            'Wiadomość:',
            $data['message'],
            '',
            '---',
            'Zgody: przetwarzanie danych, kontakt e-mail, kontakt telefoniczny — zaznaczone.',
            'Strona: ' . ($page !== '' ? $page : '-'),
            'Wysłano: ' . self::now(),
        ]);
    }

    /** @param array{phone: string, site: string} $data */
    public static function quickContactBody(array $data, string $source = '', string $ip = ''): string
    {
        return implode("\n", [
            'Prośba o kontakt',
            '',
            'Telefon: ' . $data['phone'],
            '',
            'Źródło: ' . ($source !== '' ? $source : '-'),
            'Strona: ' . ($data['site'] !== '' ? $data['site'] : '-'),
            'Adres IP: ' . ($ip !== '' ? $ip : '-'),
            'Data: ' . self::now(),
            '',
            '---',
            'Zgoda na kontakt: zaznaczona.',
        ]);
    }

    /**
     * Źródło zgłoszenia jak w starym module szybkiego kontaktu (ext_push_bot,
     * UrlParser::extractSource): ostatni segment ścieżki strony, a gdy go nie ma — host.
     * Trafia do tematu i nazwy nadawcy maila ("Prośba o kontakt – rudava-park").
     */
    public static function quickSource(string $site): string
    {
        $parsed = parse_url($site);
        $host = is_array($parsed) ? ($parsed['host'] ?? '') : '';
        $path = is_array($parsed) ? ($parsed['path'] ?? '') : '';
        $parts = explode('/', trim($path, '/'));

        return end($parts) ?: $host;
    }

    /**
     * Domena inwestycji dla CRM jak w starym module (ext_push_bot, Request::extractDomain):
     * /kgd-building/* => kgd-building.pl, /inwestycja/{slug} => {slug}.pl, reszta => kgd-group.pl.
     */
    public static function quickDomain(string $site): ?string
    {
        $path = parse_url($site, PHP_URL_PATH);
        if ($path === false || $path === null) {
            return null;
        }

        $segments = array_values(array_filter(explode('/', trim($path, '/'))));
        if ($segments === []) {
            return 'kgd-group.pl';
        }
        if ($segments[0] === 'kgd-building') {
            return 'kgd-building.pl';
        }

        $index = array_search('inwestycja', $segments, true);
        if ($index !== false && isset($segments[$index + 1])) {
            return $segments[$index + 1] . '.pl';
        }

        return 'kgd-group.pl';
    }

    /** Strona /kgd-building — ma własnego odbiorcę i adres w CRM (jak w starym module). */
    public static function isKgdBuildingSite(string $site): bool
    {
        return str_contains($site, 'kgd-group.pl/kgd-building');
    }

    /** Czas w strefie biura (serwer bywa ustawiony na UTC). */
    private static function now(): string
    {
        return (new \DateTimeImmutable('now', new \DateTimeZone('Europe/Warsaw')))->format('Y-m-d H:i:s');
    }

    /** @param array<string, string> $errors */
    private static function text(array $body, string $field, int $max, array &$errors, bool $multiline = false): string
    {
        $value = $body[$field] ?? '';
        if (!is_string($value)) {
            $errors[$field] = 'Must be a string';
            return '';
        }

        $value = trim($value);
        if ($value === '') {
            $errors[$field] = 'Field is required';
            return '';
        }
        if (mb_strlen($value) > $max) {
            $errors[$field] = "Must not exceed {$max} characters";
            return '';
        }
        if (!$multiline && preg_match('/[\r\n]/', $value) === 1) {
            $errors[$field] = 'Must be a single line';
            return '';
        }

        return $value;
    }

    /**
     * Numer jak w formularzu: sam numer (cyfry) + kod kraju z listy; zwraca "+48 123456789".
     * @param array<string, string> $errors
     */
    private static function phone(array $body, array &$errors): string
    {
        $phone = is_string($body['phone'] ?? null) ? preg_replace('/[\s-]/', '', $body['phone']) ?? '' : '';
        $country = is_string($body['country'] ?? null) ? strtoupper($body['country']) : '';

        if ($phone === '') {
            $errors['phone'] = 'Field is required';
            return '';
        }
        if (!isset(self::PHONE_COUNTRIES[$country])) {
            $errors['phone'] = 'Unknown country';
            return '';
        }

        [$dial, $length] = self::PHONE_COUNTRIES[$country];
        if (preg_match('/^\d{' . $length . '}$/', $phone) !== 1) {
            $errors['phone'] = "Must be {$length} digits";
            return '';
        }

        return "{$dial} {$phone}";
    }
}
