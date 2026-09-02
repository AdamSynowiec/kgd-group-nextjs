<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

final class MysqlUserRepository implements UserRepositoryInterface
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function findByLogin(string $login): ?array
    {
        $statement = $this->pdo->prepare('SELECT id, login, password, role FROM users WHERE login = :login LIMIT 1');
        $statement->execute(['login' => $login]);

        return $this->mapRowOrNull($statement->fetch());
    }

    public function findById(int $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT id, login, password, role FROM users WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);

        return $this->mapRowOrNull($statement->fetch());
    }

    public function listAll(): array
    {
        $statement = $this->pdo->query('SELECT id, login, role, created_at FROM users ORDER BY login');
        $rows = $statement->fetchAll();

        return array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'login' => (string) $row['login'],
            'role' => (string) $row['role'],
            'createdAt' => (string) $row['created_at'],
        ], $rows);
    }

    public function create(string $login, string $passwordHash, string $role): array
    {
        $statement = $this->pdo->prepare('INSERT INTO users (login, password, role) VALUES (:login, :password, :role)');
        $statement->execute(['login' => $login, 'password' => $passwordHash, 'role' => $role]);

        return [
            'id' => (int) $this->pdo->lastInsertId(),
            'login' => $login,
            'role' => $role,
        ];
    }

    public function delete(int $id): void
    {
        $statement = $this->pdo->prepare('DELETE FROM users WHERE id = :id');
        $statement->execute(['id' => $id]);
    }

    public function countAdmins(): int
    {
        $statement = $this->pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'");

        return (int) $statement->fetchColumn();
    }

    /**
     * @param array<string, mixed>|false $row
     * @return array{id: int, login: string, password: string, role: string}|null
     */
    private function mapRowOrNull(array|false $row): ?array
    {
        if ($row === false) {
            return null;
        }

        return [
            'id' => (int) $row['id'],
            'login' => (string) $row['login'],
            'password' => (string) $row['password'],
            'role' => (string) $row['role'],
        ];
    }
}
