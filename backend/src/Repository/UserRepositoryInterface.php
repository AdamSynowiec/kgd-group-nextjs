<?php

declare(strict_types=1);

namespace App\Repository;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

interface UserRepositoryInterface
{
    /** @return array{id: int, login: string, password: string, role: string}|null */
    public function findByLogin(string $login): ?array;

    /** @return array{id: int, login: string, password: string, role: string}|null */
    public function findById(int $id): ?array;

    /** @return list<array{id: int, login: string, role: string, createdAt: string}> */
    public function listAll(): array;

    /** @return array{id: int, login: string, role: string} */
    public function create(string $login, string $passwordHash, string $role): array;

    public function delete(int $id): void;

    /** Liczba kont z rolą "admin" — do pilnowania, że przynajmniej jedno zawsze zostaje. */
    public function countAdmins(): int;
}
