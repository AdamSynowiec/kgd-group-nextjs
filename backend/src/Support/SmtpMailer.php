<?php

declare(strict_types=1);

namespace App\Support;

use App\Config\Config;
use App\Exception\MailException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Minimalny klient SMTP — bez Composera/PHPMailera, bo backend ma dać się wgrać
 * samym FTP. Obsługuje to, czego potrzebują formularze: połączenie szyfrowane
 * (SMTP_SECURE=ssl, port zwykle 465) albo STARTTLS (tls, port 587), logowanie
 * AUTH LOGIN/PLAIN, kilku odbiorców, Reply-To i treść text/plain w UTF-8.
 *
 * Konfiguracja wyłącznie z .env (patrz fromConfig / backend/.env.example) —
 * zmiana serwera pocztowego to zmiana .env, bez dotykania kodu.
 */
final class SmtpMailer
{
    /** @var resource|null */
    private $socket = null;

    public function __construct(
        private readonly string $host,
        private readonly int $port,
        private readonly string $secure,
        private readonly string $username,
        private readonly string $password,
        private readonly bool $verifyTls = true,
        private readonly int $timeout = 20,
    ) {
    }

    public static function fromConfig(Config $config): self
    {
        $secure = strtolower($config->get('SMTP_SECURE', 'tls'));

        return new self(
            $config->get('SMTP_HOST'),
            (int) $config->get('SMTP_PORT', $secure === 'ssl' ? '465' : '587'),
            $secure,
            $config->get('SMTP_USER'),
            $config->get('SMTP_PASS'),
            $config->get('SMTP_VERIFY_TLS', 'true') !== 'false',
        );
    }

    public function isConfigured(): bool
    {
        return $this->host !== '';
    }

    /**
     * @param list<string> $to
     * @throws MailException
     */
    public function send(string $fromEmail, string $fromName, array $to, string $subject, string $textBody, ?string $replyTo = null): void
    {
        if (!$this->isConfigured()) {
            throw new MailException('SMTP_HOST is not configured.');
        }

        $message = self::buildMessage($fromEmail, $fromName, $to, $subject, $textBody, $replyTo);

        try {
            $this->connect();
            $this->command('MAIL FROM:<' . $fromEmail . '>', [250]);
            foreach ($to as $recipient) {
                $this->command('RCPT TO:<' . $recipient . '>', [250, 251]);
            }
            $this->command('DATA', [354]);
            $this->command(self::dotStuff($message) . "\r\n.", [250]);
            $this->quit();
        } finally {
            $this->close();
        }
    }

    /**
     * Gotowa wiadomość (nagłówki + treść) — publiczne i statyczne, żeby dało się
     * ją przetestować bez serwera SMTP.
     *
     * @param list<string> $to
     */
    public static function buildMessage(string $fromEmail, string $fromName, array $to, string $subject, string $textBody, ?string $replyTo = null): string
    {
        foreach ([$fromEmail, ...$to, ...($replyTo !== null ? [$replyTo] : [])] as $address) {
            if (filter_var($address, FILTER_VALIDATE_EMAIL) === false) {
                throw new MailException("Invalid e-mail address: {$address}");
            }
        }

        $domain = substr(strrchr($fromEmail, '@') ?: '@localhost', 1);

        $headers = [
            'Date: ' . date(DATE_RFC2822),
            'From: ' . self::address($fromEmail, $fromName),
            'To: ' . implode(', ', $to),
            'Subject: ' . self::encodeHeader($subject),
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $domain . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
        ];
        if ($replyTo !== null) {
            $headers[] = 'Reply-To: ' . $replyTo;
        }

        $body = preg_replace("/\r\n|\r|\n/", "\r\n", $textBody) ?? $textBody;

        return implode("\r\n", $headers) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($body), 76, "\r\n"));
    }

    private static function address(string $email, string $name): string
    {
        $name = trim(self::stripLineBreaks($name));

        // Nazwa nadawcy jako JEDNO słowo zakodowane — dzielona na kawałki bywa sklejana
        // przez programy pocztowe ze spacją w środku ("for mularz").
        return $name === '' ? $email : self::encodeHeader($name, split: false) . ' <' . $email . '>';
    }

    /** Nagłówek w UTF-8 (RFC 2047) — bez znaków nowej linii, więc nie da się nim wstrzyknąć kolejnego nagłówka. */
    private static function encodeHeader(string $value, bool $split = true): string
    {
        $value = self::stripLineBreaks($value);

        if (preg_match('/^[\x20-\x7E]*$/', $value) === 1) {
            return $value;
        }

        if (!$split) {
            return '=?UTF-8?B?' . base64_encode($value) . '?=';
        }

        return implode("\r\n ", array_map(
            static fn (string $chunk): string => '=?UTF-8?B?' . base64_encode($chunk) . '?=',
            mb_str_split($value, 15, 'UTF-8')
        ));
    }

    private static function stripLineBreaks(string $value): string
    {
        return str_replace(["\r", "\n"], ' ', $value);
    }

    /** Linia zaczynająca się od "." musi mieć go podwojonego — inaczej serwer uznałby ją za koniec wiadomości. */
    private static function dotStuff(string $message): string
    {
        return preg_replace('/^\./m', '..', $message) ?? $message;
    }

    private function connect(): void
    {
        $context = stream_context_create(['ssl' => [
            'verify_peer' => $this->verifyTls,
            'verify_peer_name' => $this->verifyTls,
            'allow_self_signed' => !$this->verifyTls,
            'SNI_enabled' => true,
            'peer_name' => $this->host,
        ]]);

        $scheme = $this->secure === 'ssl' ? 'ssl' : 'tcp';
        $socket = @stream_socket_client("{$scheme}://{$this->host}:{$this->port}", $errno, $errstr, $this->timeout, STREAM_CLIENT_CONNECT, $context);

        if ($socket === false) {
            $reason = $errno === 0 ? 'TLS handshake failed (certificate? try SMTP_SECURE / SMTP_VERIFY_TLS)' : "{$errstr} ({$errno})";
            throw new MailException("SMTP connection to {$this->host}:{$this->port} failed: {$reason}");
        }

        stream_set_timeout($socket, $this->timeout);
        $this->socket = $socket;

        $this->expect([220]);
        $capabilities = $this->ehlo();

        if ($this->secure === 'tls') {
            $this->command('STARTTLS', [220]);
            $crypto = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT') ? STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT : 0);
            if (@stream_socket_enable_crypto($this->socket, true, $crypto) !== true) {
                throw new MailException('SMTP STARTTLS negotiation failed.');
            }
            $capabilities = $this->ehlo();
        }

        if ($this->username !== '') {
            $this->authenticate($capabilities);
        }
    }

    private function ehlo(): string
    {
        $hostname = preg_replace('/[^A-Za-z0-9.-]/', '', (string) ($_SERVER['SERVER_NAME'] ?? gethostname() ?: 'localhost')) ?: 'localhost';

        return $this->command('EHLO ' . $hostname, [250]);
    }

    private function authenticate(string $capabilities): void
    {
        if (preg_match('/^250[ -]AUTH[ =](.*)$/mi', $capabilities, $match) !== 1) {
            throw new MailException('SMTP server does not offer AUTH (check SMTP_SECURE / port).');
        }

        $methods = strtoupper($match[1]);

        if (str_contains($methods, 'LOGIN')) {
            $this->command('AUTH LOGIN', [334]);
            $this->command(base64_encode($this->username), [334]);
            $this->command(base64_encode($this->password), [235], hideInErrors: true);
            return;
        }

        if (str_contains($methods, 'PLAIN')) {
            $this->command('AUTH PLAIN ' . base64_encode("\0{$this->username}\0{$this->password}"), [235], hideInErrors: true);
            return;
        }

        throw new MailException("SMTP server offers no supported AUTH method ({$methods}).");
    }

    private function quit(): void
    {
        try {
            $this->command('QUIT', [221]);
        } catch (MailException) {
            // Wiadomość już przyjęta (250 po DATA) — błąd przy pożegnaniu nic nie zmienia.
        }
    }

    private function close(): void
    {
        if (is_resource($this->socket)) {
            fclose($this->socket);
        }
        $this->socket = null;
    }

    /** @param list<int> $expected */
    private function command(string $line, array $expected, bool $hideInErrors = false): string
    {
        if (@fwrite($this->socket, $line . "\r\n") === false) {
            throw new MailException('SMTP write failed.');
        }

        return $this->expect($expected, $hideInErrors ? '[hidden]' : strtok($line, "\r\n"));
    }

    /** @param list<int> $expected */
    private function expect(array $expected, string $sent = '(greeting)'): string
    {
        $response = '';

        while (($line = fgets($this->socket, 1024)) !== false) {
            $response .= $line;
            // Ostatnia linia odpowiedzi wieloliniowej ma spację po kodzie ("250 OK"), wcześniejsze myślnik ("250-...").
            if (strlen($line) < 4 || $line[3] === ' ') {
                break;
            }
        }

        if ($response === '') {
            throw new MailException("SMTP: no response after {$sent} (connection closed or timeout; wrong login/password?).");
        }

        $code = (int) substr($response, 0, 3);
        if (!in_array($code, $expected, true)) {
            throw new MailException('SMTP: unexpected reply to ' . $sent . ': ' . trim($response));
        }

        return $response;
    }
}
