<?php

declare(strict_types=1);

namespace App\Support;

use App\Config\Config;
use RuntimeException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Powiadomienie CRM o zgłoszeniu z formularza kontaktowego — 1:1 ze starym
 * serwerem (modules/ext_mailer, Request::crmRequest): POST JSON na webhook
 * CRM, ten sam kształt danych, wywoływany PO udanej wysyłce maila, a błąd CRM
 * tylko trafia do logu (formularz i tak zwraca sukces — mail już poszedł).
 *
 * Różnice względem starego kodu (tylko bezpieczeństwo/niezawodność, kształt
 * danych bez zmian): adres z .env zamiast zaszytego w kodzie, limit czasu
 * (stary curl nie miał żadnego — zawieszony CRM blokował odpowiedź formularza)
 * i logowanie odpowiedzi innej niż 2xx.
 */
final class CrmWebhook
{
    public function __construct(
        private readonly string $url,
        private readonly bool $verifyTls = true,
        private readonly int $timeout = 10,
    ) {
    }

    public static function fromConfig(Config $config): self
    {
        return new self(
            $config->get('CRM_WEBHOOK_URL'),
            $config->get('CRM_VERIFY_TLS', 'true') !== 'false',
            max(1, (int) $config->get('CRM_TIMEOUT', '10')),
        );
    }

    public function isEnabled(): bool
    {
        return $this->url !== '';
    }

    /**
     * Payload dokładnie jak w starym Request::validate() + crmRequest():
     * name/email/phone/message/target przez htmlspecialchars (tak dostawał je CRM),
     * domain = część po "@" z target, utm zagnieżdżone {source, medium, campaign}.
     *
     * @param array{name: string, email: string, message: string} $data zwalidowane pola formularza
     * @param array<string, mixed> $body surowe body żądania (phone, target, utm jak wysyła strona)
     * @return array<string, mixed>
     */
    public static function buildPayload(array $data, array $body, string $defaultTarget = ''): array
    {
        // Jak w starym Request::validate(): brak target = adres domyślny (tam zaszyty
        // "formularz@krj307-2.pl", tu CRM_DEFAULT_TARGET z .env).
        $target = is_string($body['target'] ?? null) ? trim($body['target']) : '';
        if (filter_var($target, FILTER_VALIDATE_EMAIL) === false) {
            $target = filter_var($defaultTarget, FILTER_VALIDATE_EMAIL) !== false ? $defaultTarget : '';
        }

        // Sam numer, tak jak wpisany w formularzu (stary serwer nie dokładał prefiksu kraju).
        $phone = is_string($body['phone'] ?? null) ? (preg_replace('/[\s-]/', '', $body['phone']) ?? '') : '';

        $utm = is_array($body['utm'] ?? null) ? $body['utm'] : [];

        return [
            'name' => self::escape($data['name']),
            'email' => self::escape($data['email']),
            'phone' => self::escape($phone),
            'message' => self::escape($data['message']),
            'target' => $target === '' ? null : self::escape($target),
            'domain' => $target === '' ? null : substr($target, strrpos($target, '@') + 1),
            'utm' => [
                'source' => self::utm($utm, 'source'),
                'medium' => self::utm($utm, 'medium'),
                'campaign' => self::utm($utm, 'campaign'),
            ],
        ];
    }

    /**
     * Payload szybkiego kontaktu 1:1 z modułem ext_push_bot (Request::validate()):
     * kolejność kluczy name, email, phone, message, target, site, utm, domain;
     * puste name/email/message => null; wartości przez htmlspecialchars; domena z adresu strony
     * (nie z target jak w formularzu kontaktowym); target domyślny "kontakt@kgd-group.pl",
     * a dla strony /kgd-building "kontakt@kgd-building.pl".
     *
     * @param array{phone: string, site: string} $data zwalidowane pola (ContactForm::validateQuickContact)
     * @param array<string, mixed> $body surowe body żądania
     * @return array<string, mixed>
     */
    public static function buildQuickPayload(array $data, array $body, string $defaultTarget = 'kontakt@kgd-group.pl', string $buildingTarget = 'kontakt@kgd-building.pl'): array
    {
        $site = $data['site'];

        $target = is_string($body['target'] ?? null) ? trim($body['target']) : '';
        if (filter_var($target, FILTER_VALIDATE_EMAIL) === false) {
            $target = $defaultTarget;
        }
        if (ContactForm::isKgdBuildingSite($site)) {
            $target = $buildingTarget;
        }

        $phone = is_string($body['phone'] ?? null) ? (preg_replace('/[\s-]/', '', $body['phone']) ?? '') : '';
        $utm = is_array($body['utm'] ?? null) ? $body['utm'] : [];
        // Stary moduł czytał też utm_* z korzenia body.
        foreach (['source', 'medium', 'campaign'] as $key) {
            if (!isset($utm[$key]) && !isset($utm['utm_' . $key]) && is_string($body['utm_' . $key] ?? null)) {
                $utm['utm_' . $key] = $body['utm_' . $key];
            }
        }

        return [
            'name' => self::optional($body['name'] ?? null),
            'email' => self::optional($body['email'] ?? null),
            'phone' => self::escape($phone),
            'message' => self::optional($body['message'] ?? null),
            'target' => self::escape($target),
            'site' => $site !== '' ? self::escape($site) : null,
            'utm' => [
                'source' => self::utm($utm, 'source'),
                'medium' => self::utm($utm, 'medium'),
                'campaign' => self::utm($utm, 'campaign'),
            ],
            'domain' => ContactForm::quickDomain($site),
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @throws RuntimeException przy błędzie połączenia albo odpowiedzi innej niż 2xx
     */
    public function send(array $payload): int
    {
        if (!function_exists('curl_init')) {
            throw new RuntimeException('CRM request failed: PHP curl extension is not available.');
        }

        $handle = curl_init($this->url);
        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Accept: application/json'],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
            CURLOPT_CONNECTTIMEOUT => min(5, $this->timeout),
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_SSL_VERIFYPEER => $this->verifyTls,
            CURLOPT_SSL_VERIFYHOST => $this->verifyTls ? 2 : 0,
        ]);

        $response = curl_exec($handle);

        if ($response === false) {
            $error = curl_error($handle);
            curl_close($handle);
            throw new RuntimeException('CRM request failed: ' . $error);
        }

        $status = (int) curl_getinfo($handle, CURLINFO_HTTP_CODE);
        curl_close($handle);

        if ($status < 200 || $status >= 300) {
            throw new RuntimeException("CRM responded with HTTP {$status}: " . substr((string) $response, 0, 300));
        }

        return $status;
    }

    private static function optional(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : '';

        return $value === '' ? null : self::escape($value);
    }

    private static function escape(string $value): string
    {
        return htmlspecialchars($value);
    }

    /**
     * Strona wysyła utm jako {utm_source, utm_medium, utm_campaign} (stary format);
     * akceptujemy też {source, medium, campaign} — tak samo jak stary crmRequest.
     *
     * @param array<string, mixed> $utm
     */
    private static function utm(array $utm, string $key): ?string
    {
        $value = $utm['utm_' . $key] ?? $utm[$key] ?? null;
        if (!is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : mb_substr($value, 0, 200);
    }
}
