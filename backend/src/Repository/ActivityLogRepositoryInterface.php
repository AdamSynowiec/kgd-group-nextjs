<?php

declare(strict_types=1);

namespace App\Repository;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Patrz db/013_create_activity_log.sql. */
interface ActivityLogRepositoryInterface
{
    /**
     * Zapisuje jedno zdarzenie. $userId/$login to migawka W CHWILI zdarzenia
     * (nie JOIN do `users`) — wpis ma przeżyć późniejsze usunięcie konta.
     * $action — string z tego samego słownika co PermissionRegistry::ALL
     * tam, gdzie to ma sens (np. "pages.update"), plus kilka zdarzeń bez
     * odpowiadającego uprawnienia (np. "auth.login_failed") — patrz wywołania
     * w poszczególnych kontrolerach.
     *
     * @param array<string, mixed>|null $details NIGDY hasła/hashe/tokeny.
     */
    public function log(?int $userId, ?string $login, string $action, ?string $target = null, ?array $details = null): void;

    /**
     * @return list<array{id: int, userId: int|null, login: string|null, action: string, target: string|null, details: array<string, mixed>|null, ipAddress: string|null, createdAt: string}>
     */
    public function list(int $limit, int $offset): array;

    public function count(): int;
}
