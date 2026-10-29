<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Adres e-mail konta panelu i jednorazowe linki z maili (db/039_account_email_verification.sql):
 * users.email / email_verified_at / pending_email oraz tabela user_tokens.
 *
 * Token: 64 znaki hex (256 bitów losowości), w bazie tylko jego sha256. Zużywany atomowo
 * (UPDATE ... WHERE used_at IS NULL) — ten sam link nie zadziała dwa razy, nawet równolegle.
 */
final class MysqlAccountRepository
{
    public const PURPOSE_EMAIL = 'email_verify';
    public const PURPOSE_PASSWORD = 'password_reset';

    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array{login: string, email: ?string, emailVerified: bool, pendingEmail: ?string}|null */
    public function status(int $userId): ?array
    {
        $statement = $this->pdo->prepare('SELECT login, email, email_verified_at, pending_email FROM users WHERE id = :id');
        $statement->execute(['id' => $userId]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        return [
            'login' => (string) $row['login'],
            'email' => $row['email'] !== null ? (string) $row['email'] : null,
            'emailVerified' => $row['email'] !== null && $row['email_verified_at'] !== null,
            'pendingEmail' => $row['pending_email'] !== null ? (string) $row['pending_email'] : null,
        ];
    }

    public function emailTaken(string $email, int $exceptUserId): bool
    {
        $statement = $this->pdo->prepare('SELECT 1 FROM users WHERE email = :email AND id <> :id LIMIT 1');
        $statement->execute(['email' => $email, 'id' => $exceptUserId]);

        return $statement->fetchColumn() !== false;
    }

    public function setPendingEmail(int $userId, string $email): void
    {
        $this->pdo->prepare('UPDATE users SET pending_email = :email WHERE id = :id')->execute(['email' => $email, 'id' => $userId]);
    }

    /** Rzuca PDOException (23000), gdy adres zdążył zająć inne konto. */
    public function confirmEmail(int $userId, string $email): void
    {
        $this->pdo->prepare('UPDATE users SET email = :email, email_verified_at = CURRENT_TIMESTAMP, pending_email = NULL WHERE id = :id')
            ->execute(['email' => $email, 'id' => $userId]);
    }

    /**
     * Konto po loginie albo potwierdzonym adresie — tylko z potwierdzonym adresem (na niego idzie link).
     *
     * @return array{id: int, login: string, email: string}|null
     */
    public function findWithVerifiedEmail(string $loginOrEmail): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT id, login, email FROM users WHERE (login = :login OR email = :email) '
            . 'AND email IS NOT NULL AND email_verified_at IS NOT NULL LIMIT 1'
        );
        $statement->execute(['login' => $loginOrEmail, 'email' => $loginOrEmail]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : ['id' => (int) $row['id'], 'login' => (string) $row['login'], 'email' => (string) $row['email']];
    }

    public function updatePassword(int $userId, string $passwordHash): void
    {
        $this->pdo->prepare('UPDATE users SET password = :password WHERE id = :id')->execute(['password' => $passwordHash, 'id' => $userId]);
    }

    /** Nowy link; wcześniejsze niezużyte linki tego samego rodzaju przestają działać. */
    public function issueToken(int $userId, string $purpose, ?string $email, int $ttlSeconds): string
    {
        $this->revokeTokens($userId, $purpose);
        $token = bin2hex(random_bytes(32));
        $this->pdo->prepare(
            'INSERT INTO user_tokens (user_id, purpose, token_hash, email, expires_at) '
            . 'VALUES (:user, :purpose, :hash, :email, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL :ttl SECOND))'
        )->execute(['user' => $userId, 'purpose' => $purpose, 'hash' => hash('sha256', $token), 'email' => $email, 'ttl' => $ttlSeconds]);

        return $token;
    }

    /** Ile linków danego rodzaju konto dostało w ostatnich $seconds sekundach (limit wysyłek). */
    public function recentTokens(int $userId, string $purpose, int $seconds): int
    {
        $statement = $this->pdo->prepare(
            'SELECT COUNT(*) FROM user_tokens WHERE user_id = :user AND purpose = :purpose '
            . 'AND created_at > DATE_SUB(CURRENT_TIMESTAMP, INTERVAL :seconds SECOND)'
        );
        $statement->execute(['user' => $userId, 'purpose' => $purpose, 'seconds' => $seconds]);

        return (int) $statement->fetchColumn();
    }

    /**
     * Zużywa ważny link. null = nieznany, wygasły albo już użyty.
     *
     * @return array{userId: int, email: ?string}|null
     */
    public function consumeToken(string $purpose, string $token): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT id, user_id, email FROM user_tokens WHERE token_hash = :hash AND purpose = :purpose '
            . 'AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP'
        );
        $statement->execute(['hash' => hash('sha256', $token), 'purpose' => $purpose]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        if ($row === false) {
            return null;
        }

        $use = $this->pdo->prepare('UPDATE user_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = :id AND used_at IS NULL');
        $use->execute(['id' => $row['id']]);
        if ($use->rowCount() !== 1) {
            return null;
        }

        return ['userId' => (int) $row['user_id'], 'email' => $row['email'] !== null ? (string) $row['email'] : null];
    }

    public function revokeTokens(int $userId, string $purpose): void
    {
        $this->pdo->prepare('UPDATE user_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = :user AND purpose = :purpose AND used_at IS NULL')
            ->execute(['user' => $userId, 'purpose' => $purpose]);
    }
}
