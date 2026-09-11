<?php

declare(strict_types=1);

namespace App\Repository;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Patrz db/010_create_roles_table.sql. */
interface RoleRepositoryInterface
{
    /** @return list<array{name: string, label: string, createdAt: string}> */
    public function listAll(): array;

    public function exists(string $name): bool;

    /** @return array{name: string, label: string} */
    public function create(string $name, string $label): array;

    /** Rzuca, jeśli "name" nie istnieje — kontroler sam sprawdza to wcześniej dla czytelnego 404. */
    public function delete(string $name): void;

    /** Liczba kont (tabela `users`) przypisanych do tej roli — do pilnowania, że nie usuwa się roli w użyciu. */
    public function countUsersWithRole(string $name): int;
}
