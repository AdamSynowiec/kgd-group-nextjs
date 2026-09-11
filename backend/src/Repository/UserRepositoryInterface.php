<?php

declare(strict_types=1);

namespace App\Repository;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

interface UserRepositoryInterface
{
    /** @return array{id: int, login: string, email: string|null, password: string, role: string}|null */
    public function findByLogin(string $login): ?array;

    /** @return array{id: int, login: string, email: string|null, password: string, role: string}|null */
    public function findById(int $id): ?array;

    /** @return list<array{id: int, login: string, email: string|null, role: string, createdAt: string}> */
    public function listAll(): array;

    /** @return array{id: int, login: string, role: string} */
    public function create(string $login, string $passwordHash, string $role): array;

    public function delete(int $id): void;

    /** Samoobsługowa zmiana e-maila WŁASNEGO konta — patrz UsersController::updateOwnAccount(). Rzuca PDOException (23000) przy kolizji z już zajętym adresem. */
    public function updateEmail(int $id, string $email): void;

    /** Samoobsługowa zmiana hasła WŁASNEGO konta — $passwordHash już po password_hash(), nigdy jawny tekst. */
    public function updatePassword(int $id, string $passwordHash): void;
}
