<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Exception\MailException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\ActivityLogRepositoryInterface;
use App\Repository\MysqlAccountRepository;
use App\Repository\UserRepositoryInterface;
use App\Support\FileLog;
use App\Support\SmtpMailer;
use JsonException;
use PDOException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Adres e-mail konta panelu (obowiązkowy, potwierdzany linkiem) i reset hasła mailem — db/039.
 *
 *   GET  /account/email         stan adresu zalogowanego konta,
 *   POST /account/email         {"email", "currentPassword"} — wysyła link potwierdzający na nowy adres,
 *   POST /account/email/verify  {"token"} — publiczna: link z maila ustawia adres jako potwierdzony,
 *   POST /password/forgot       {"login"} — publiczna: link do ustawienia hasła (login albo e-mail),
 *   POST /password/reset        {"token", "password"} — publiczna: nowe hasło z linku.
 *
 * Blokada panelu: requireVerifiedEmail() przed każdą trasą poza powyższymi i /me (admin.php).
 * Działa, gdy jest kim (sesja) i czym (SMTP) wysłać link — bez poczty nikt nie mógłby się odblokować.
 */
final class AccountController
{
    private const EMAIL_LINK_TTL = 86400;
    private const PASSWORD_LINK_TTL = 3600;
    /** Najwyżej tyle maili jednego rodzaju na konto w oknie LIMIT_WINDOW sekund. */
    private const LIMIT = 3;
    private const LIMIT_WINDOW = 900;
    private const MIN_PASSWORD = 8;

    public function __construct(
        private readonly MysqlAccountRepository $accounts,
        private readonly UserRepositoryInterface $users,
        private readonly SmtpMailer $mailer,
        private readonly ActivityLogRepositoryInterface $activity,
        private readonly string $siteUrl,
        private readonly string $fromEmail,
        private readonly string $fromName
    ) {
    }

    /**
     * Czy konto musi najpierw podać i potwierdzić adres. Bez migracji 039 (brak kolumn) — nie,
     * żeby wgranie kodu przed uruchomieniem migracji nie zamknęło panelu.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $session
     */
    public function verificationRequired(?array $session): bool
    {
        if ($session === null || !$this->canSendMail()) {
            return false;
        }
        try {
            $status = $this->accounts->status($session['userId']);
        } catch (PDOException $exception) {
            if (in_array($exception->getCode(), ['42S02', '42S22'], true)) {
                return false;
            }
            throw $exception;
        }

        return $status !== null && !$status['emailVerified'];
    }

    /** @param array{userId: int, login: string, role: string, exp: int}|null $session */
    public function requireVerifiedEmail(?array $session): void
    {
        if ($this->verificationRequired($session)) {
            throw new ApiException('Podaj i potwierdź adres e-mail, aby korzystać z panelu.', 403, 'email_verification_required');
        }
    }

    /** @param array{userId: int, login: string, role: string, exp: int}|null $session */
    public function status(?array $session): void
    {
        JsonResponse::ok($this->currentStatus($session));
    }

    /** @param array{userId: int, login: string, role: string, exp: int}|null $session */
    public function requestEmail(Request $request, ?array $session): void
    {
        $user = $this->sessionUser($session);
        $body = self::body($request);

        $password = $body['currentPassword'] ?? null;
        if (!is_string($password) || $password === '' || !password_verify($password, $user['password'])) {
            throw new ApiException('Nieprawidłowe obecne hasło.', 400);
        }

        $email = is_string($body['email'] ?? null) ? mb_strtolower(trim($body['email'])) : '';
        if ($email === '' || mb_strlen($email) > 190 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new ApiException('Nieprawidłowy adres e-mail.', 422);
        }
        $status = $this->accounts->status($user['id']);
        if ($status['emailVerified'] && $status['email'] === $email) {
            throw new ApiException('To już jest potwierdzony adres tego konta.', 422);
        }
        if ($this->accounts->emailTaken($email, $user['id'])) {
            throw new ApiException('Ten adres e-mail jest już używany przez inne konto.', 409);
        }
        if (!$this->canSendMail()) {
            throw new ApiException('Wysyłka maili nie jest skonfigurowana — skontaktuj się z administratorem.', 503);
        }
        $this->throttle($user['id'], MysqlAccountRepository::PURPOSE_EMAIL);

        $this->accounts->setPendingEmail($user['id'], $email);
        $token = $this->accounts->issueToken($user['id'], MysqlAccountRepository::PURPOSE_EMAIL, $email, self::EMAIL_LINK_TTL);
        $this->send($email, 'Potwierdź adres e-mail w panelu', implode("\n", [
            "Cześć {$user['login']},",
            '',
            'ten adres został podany dla Twojego konta w panelu administracyjnym. Kliknij link, aby go potwierdzić:',
            '',
            $this->link('/admin/potwierdz-email/', $token),
            '',
            'Link jest ważny 24 godziny i działa jeden raz. Na ten adres będzie można później przywrócić hasło.',
            'Jeśli to nie Ty — zignoruj tę wiadomość.',
        ]));
        $this->activity->log($user['id'], $user['login'], 'account.email.request', $email);

        JsonResponse::ok($this->currentStatus($session));
    }

    public function verifyEmail(Request $request): void
    {
        $token = self::token(self::body($request)['token'] ?? null);
        $used = $token === null ? null : $this->accounts->consumeToken(MysqlAccountRepository::PURPOSE_EMAIL, $token);
        if ($used === null || $used['email'] === null) {
            throw new ApiException('Link wygasł albo został już użyty. Zaloguj się i wyślij nowy.', 410);
        }

        try {
            $this->accounts->confirmEmail($used['userId'], $used['email']);
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                throw new ApiException('Ten adres e-mail jest już używany przez inne konto.', 409);
            }
            throw $exception;
        }
        $login = $this->accounts->status($used['userId'])['login'] ?? null;
        $this->activity->log($used['userId'], $login, 'account.email.verify', $used['email']);

        JsonResponse::ok(['email' => $used['email']]);
    }

    /** Odpowiedź zawsze ta sama — nie zdradza, czy takie konto istnieje. */
    public function forgotPassword(Request $request): void
    {
        $login = self::body($request)['login'] ?? null;
        $identifier = is_string($login) ? trim($login) : '';
        if ($identifier === '' || mb_strlen($identifier) > 190) {
            throw new ApiException('Podaj login albo adres e-mail.', 422);
        }

        $user = $this->canSendMail() ? $this->accounts->findWithVerifiedEmail($identifier) : null;
        if ($user !== null && $this->accounts->recentTokens($user['id'], MysqlAccountRepository::PURPOSE_PASSWORD, self::LIMIT_WINDOW) < self::LIMIT) {
            $token = $this->accounts->issueToken($user['id'], MysqlAccountRepository::PURPOSE_PASSWORD, null, self::PASSWORD_LINK_TTL);
            try {
                $this->send($user['email'], 'Ustaw nowe hasło do panelu', implode("\n", [
                    "Cześć {$user['login']},",
                    '',
                    'ktoś poprosił o ustawienie nowego hasła do Twojego konta w panelu administracyjnym. Kliknij link:',
                    '',
                    $this->link('/admin/reset-hasla/', $token),
                    '',
                    'Link jest ważny 1 godzinę i działa jeden raz.',
                    'Jeśli to nie Ty — zignoruj tę wiadomość, hasło się nie zmieni.',
                ]));
                $this->activity->log($user['id'], $user['login'], 'auth.password.forgot');
            } catch (ApiException) {
                // Błąd wysyłki już jest w logu (send()); odpowiedź ma wyglądać tak samo jak dla nieznanego konta.
            }
        }

        JsonResponse::ok(['sent' => true]);
    }

    public function resetPassword(Request $request): void
    {
        $body = self::body($request);
        $password = $body['password'] ?? null;
        if (!is_string($password) || mb_strlen($password) < self::MIN_PASSWORD) {
            throw new ApiException('Hasło musi mieć co najmniej ' . self::MIN_PASSWORD . ' znaków.', 422);
        }

        $token = self::token($body['token'] ?? null);
        $used = $token === null ? null : $this->accounts->consumeToken(MysqlAccountRepository::PURPOSE_PASSWORD, $token);
        if ($used === null) {
            throw new ApiException('Link wygasł albo został już użyty. Poproś o nowy.', 410);
        }

        $this->accounts->updatePassword($used['userId'], password_hash($password, PASSWORD_DEFAULT));
        $this->accounts->revokeTokens($used['userId'], MysqlAccountRepository::PURPOSE_PASSWORD);
        $login = $this->accounts->status($used['userId'])['login'] ?? null;
        $this->activity->log($used['userId'], $login, 'auth.password.reset');

        JsonResponse::ok(['reset' => true]);
    }

    /**
     * @param array{userId: int, login: string, role: string, exp: int}|null $session
     * @return array{login: string, email: ?string, emailVerified: bool, pendingEmail: ?string, required: bool}
     */
    private function currentStatus(?array $session): array
    {
        $user = $this->sessionUser($session);

        return $this->accounts->status($user['id']) + ['required' => $this->verificationRequired($session)];
    }

    /**
     * @param array{userId: int, login: string, role: string, exp: int}|null $session
     * @return array{id: int, login: string, email: string|null, password: string, role: string}
     */
    private function sessionUser(?array $session): array
    {
        if ($session === null) {
            throw new ApiException('Ta operacja wymaga zalogowania.', 400);
        }
        $user = $this->users->findById($session['userId']);
        if ($user === null) {
            throw new ApiException('Sesja nieważna — zaloguj się ponownie.', 401);
        }

        return $user;
    }

    private function throttle(int $userId, string $purpose): void
    {
        if ($this->accounts->recentTokens($userId, $purpose, self::LIMIT_WINDOW) >= self::LIMIT) {
            throw new ApiException('Wysłano już kilka maili — spróbuj ponownie za kilkanaście minut.', 429);
        }
    }

    private function canSendMail(): bool
    {
        return $this->mailer->isConfigured() && $this->fromEmail !== '';
    }

    private function send(string $to, string $subject, string $text): void
    {
        try {
            $this->mailer->send($this->fromEmail, $this->fromName, [$to], $subject, $text);
        } catch (MailException $exception) {
            FileLog::write('account', 'mail failed: ' . $exception->getMessage());
            throw new ApiException('Nie udało się wysłać maila. Spróbuj ponownie za chwilę.', 503);
        }
    }

    private function link(string $path, string $token): string
    {
        return $this->siteUrl . $path . '?token=' . $token;
    }

    private static function token(mixed $value): ?string
    {
        return is_string($value) && preg_match('/^[0-9a-f]{64}$/', $value) === 1 ? $value : null;
    }

    /** @return array<string, mixed> */
    private static function body(Request $request): array
    {
        try {
            return $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }
    }
}
