<?php

declare(strict_types=1);

namespace App\Controller;

use App\Config\Config;
use App\Exception\MailException;
use App\Http\JsonResponse;
use App\Support\ContactForm;
use App\Support\ContactRateLimiter;
use App\Support\CrmWebhook;
use App\Support\FileLog;
use App\Support\SmtpMailer;
use JsonException;
use Throwable;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Formularze strony (publiczne, bez logowania) — wysyłka maila przez SMTP:
 *   POST ?route=/contact        — formularz kontaktowy (src/components/shared/Contact.tsx)
 *   POST ?route=/quick-contact  — "szybki kontakt" / prośba o telefon (CallToUs.tsx)
 *
 * Ochrona przed spamem: pole-pułapka "address", limit zgłoszeń per IP
 * (ContactRateLimiter) i stała lista dozwolonych odbiorców — strona NIE może
 * wskazać dowolnego adresu (patrz ContactForm::isAllowedTarget).
 *
 * Po wysłaniu maila z formularza kontaktowego zgłoszenie idzie też do CRM
 * (CrmWebhook, CRM_WEBHOOK_URL w .env) — dokładnie jak na starym serwerze
 * (modules/ext_mailer): błąd CRM tylko do logu, formularz i tak dostaje sukces.
 */
final class ContactController
{
    private const MAX_BODY_BYTES = 32768;

    public function __construct(
        private readonly Config $config,
        private readonly SmtpMailer $mailer,
        private readonly ContactRateLimiter $limiter,
        private readonly CrmWebhook $crm,
    ) {
    }

    public function contact(): void
    {
        $body = $this->readJsonBody();

        if (ContactForm::isSpam($body)) {
            // Botowi odpowiadamy "sukcesem", żeby nie uczył się omijać pułapki.
            JsonResponse::ok(['sent' => true]);
        }

        [$errors, $data] = ContactForm::validateContact($body);
        $this->failOnErrors($errors);
        $this->guardRate('contact');

        $recipients = $this->recipients('CONTACT_MAIL_TO');
        $target = is_string($body['target'] ?? null) ? $body['target'] : '';
        if ($target !== '' && ContactForm::isAllowedTarget($target, ContactForm::parseList($this->config->get('CONTACT_ALLOWED_TARGETS')))) {
            $recipients = [strtolower(trim($target))];
        }

        $page = (string) ($_SERVER['HTTP_REFERER'] ?? '');
        $this->deliver(
            'contact',
            $recipients,
            '[Formularz] ' . $data['subject'],
            ContactForm::contactBody($data, preg_match('~^https?://\S{1,500}$~i', $page) === 1 ? $page : ''),
            $data['email'],
            fn () => $this->notifyCrm(CrmWebhook::buildPayload($data, $body, $this->config->get('CRM_DEFAULT_TARGET')))
        );
    }

    public function quickContact(): void
    {
        $body = $this->readJsonBody();

        if (ContactForm::isSpam($body)) {
            JsonResponse::ok(['sent' => true]);
        }

        [$errors, $data] = ContactForm::validateQuickContact($body);
        $this->failOnErrors($errors);
        $this->guardRate('quick');

        $recipients = $this->recipients('QUICK_CONTACT_MAIL_TO');
        if ($recipients === []) {
            $recipients = $this->recipients('CONTACT_MAIL_TO');
        }

        $this->deliver('quick', $recipients, 'Prośba o kontakt telefoniczny: ' . $data['phone'], ContactForm::quickContactBody($data), null);
    }

    /**
     * @param list<string> $recipients
     * @param (callable(): void)|null $afterSend wywoływane tylko po udanej wysyłce maila
     */
    private function deliver(string $kind, array $recipients, string $subject, string $text, ?string $replyTo, ?callable $afterSend = null): void
    {
        $from = $this->config->get('SMTP_FROM', $this->config->get('SMTP_USER'));

        if (!$this->mailer->isConfigured() || $recipients === [] || $from === '') {
            FileLog::write('contact', 'mail not configured (SMTP_HOST / SMTP_FROM / CONTACT_MAIL_TO)');
            JsonResponse::error(503, 'Wysyłka wiadomości jest chwilowo niedostępna.');
        }

        try {
            $this->mailer->send($from, $this->config->get('SMTP_FROM_NAME', 'Formularz strony'), $recipients, $subject, $text, $replyTo);
        } catch (MailException $exception) {
            // Odpowiedź serwera SMTP tylko do logu — przeglądarka dostaje ogólny komunikat.
            FileLog::write('contact', $exception->getMessage());
            JsonResponse::error(502, 'Nie udało się wysłać wiadomości. Spróbuj ponownie później.');
        }

        $this->limiter->record($this->clientIp(), $kind);

        if ($afterSend !== null) {
            $afterSend();
        }

        JsonResponse::ok(['sent' => true]);
    }

    /** @param array<string, mixed> $payload */
    private function notifyCrm(array $payload): void
    {
        if (!$this->crm->isEnabled()) {
            FileLog::write('contact', 'CRM disabled (CRM_WEBHOOK_URL empty)');
            return;
        }

        try {
            $status = $this->crm->send($payload);
            FileLog::write('contact', 'CRM OK (HTTP ' . $status . ', target=' . ($payload['target'] ?? '-') . ')');
        } catch (Throwable $exception) {
            // Jak na starym serwerze: CRM nie może zepsuć formularza — mail już wysłany.
            FileLog::write('contact', 'CRM ERROR: ' . $exception->getMessage());
        }
    }

    /** @param array<string, string> $errors */
    private function failOnErrors(array $errors): void
    {
        if ($errors !== []) {
            JsonResponse::send(['error' => ['status' => 422, 'message' => 'Nieprawidłowe dane formularza.', 'fields' => $errors]], 422);
        }
    }

    private function guardRate(string $kind): void
    {
        if ($this->limiter->tooMany($this->clientIp())) {
            FileLog::write('contact', "rate limit hit ({$kind})");
            JsonResponse::error(429, 'Zbyt wiele wiadomości. Spróbuj ponownie za kilka minut.');
        }
    }

    /** @return list<string> */
    private function recipients(string $key): array
    {
        return array_values(array_filter(
            ContactForm::parseList($this->config->get($key)),
            static fn (string $email): bool => filter_var($email, FILTER_VALIDATE_EMAIL) !== false
        ));
    }

    private function clientIp(): string
    {
        return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    }

    /** @return array<string, mixed> */
    private function readJsonBody(): array
    {
        if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
            JsonResponse::error(415, 'Content-Type musi być application/json.');
        }

        $raw = stream_get_contents(fopen('php://input', 'r'), self::MAX_BODY_BYTES + 1) ?: '';
        if (strlen($raw) > self::MAX_BODY_BYTES) {
            JsonResponse::error(413, 'Zbyt duże zgłoszenie.');
        }

        try {
            $data = json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            JsonResponse::error(400, 'Nieprawidłowy JSON.');
        }

        if (!is_array($data) || array_is_list($data)) {
            JsonResponse::error(400, 'Oczekiwano obiektu JSON.');
        }

        return $data;
    }
}
