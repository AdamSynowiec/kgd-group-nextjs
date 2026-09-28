<?php

declare(strict_types=1);

namespace App\Support;

use PDO;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Limit zgłoszeń z formularzy per adres IP (tabela contact_submissions, patrz
 * db/020_create_contact_submissions.sql). Zapisujemy wyłącznie skrót IP (sha256
 * z solą), rodzaj formularza i czas — nie treść zgłoszenia ani dane osobowe.
 */
final class ContactRateLimiter
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly string $salt,
        private readonly int $maxPerWindow = 5,
        private readonly int $windowSeconds = 600,
    ) {
    }

    public function tooMany(string $ip): bool
    {
        $statement = $this->pdo->prepare(
            'SELECT COUNT(*) FROM contact_submissions WHERE ip_hash = :ip AND created_at > (NOW() - INTERVAL :window SECOND)'
        );
        $statement->bindValue('ip', $this->hash($ip));
        $statement->bindValue('window', $this->windowSeconds, PDO::PARAM_INT);
        $statement->execute();

        return (int) $statement->fetchColumn() >= $this->maxPerWindow;
    }

    public function record(string $ip, string $kind): void
    {
        $statement = $this->pdo->prepare('INSERT INTO contact_submissions (kind, ip_hash) VALUES (:kind, :ip)');
        $statement->execute(['kind' => $kind, 'ip' => $this->hash($ip)]);

        // Sprzątanie starych wpisów przy okazji — tabela nie rośnie w nieskończoność.
        $this->pdo->exec('DELETE FROM contact_submissions WHERE created_at < (NOW() - INTERVAL 1 DAY)');
    }

    private function hash(string $ip): string
    {
        return hash('sha256', $this->salt . '|' . $ip);
    }
}
