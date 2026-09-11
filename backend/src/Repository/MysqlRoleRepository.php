<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Implementacja RoleRepositoryInterface na tabeli "roles" (patrz db/010_create_roles_table.sql). */
final class MysqlRoleRepository implements RoleRepositoryInterface
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function listAll(): array
    {
        $statement = $this->pdo->query('SELECT name, label, created_at FROM roles ORDER BY name');
        $rows = $statement->fetchAll();

        return array_map(static fn (array $row): array => [
            'name' => (string) $row['name'],
            'label' => (string) $row['label'],
            'createdAt' => (string) $row['created_at'],
        ], $rows);
    }

    public function exists(string $name): bool
    {
        $statement = $this->pdo->prepare('SELECT 1 FROM roles WHERE name = :name LIMIT 1');
        $statement->execute(['name' => $name]);

        return $statement->fetchColumn() !== false;
    }

    public function create(string $name, string $label): array
    {
        $statement = $this->pdo->prepare('INSERT INTO roles (name, label) VALUES (:name, :label)');
        $statement->execute(['name' => $name, 'label' => $label]);

        return ['name' => $name, 'label' => $label];
    }

    public function delete(string $name): void
    {
        $statement = $this->pdo->prepare('DELETE FROM roles WHERE name = :name');
        $statement->execute(['name' => $name]);
    }

    public function countUsersWithRole(string $name): int
    {
        $statement = $this->pdo->prepare('SELECT COUNT(*) FROM users WHERE role = :name');
        $statement->execute(['name' => $name]);

        return (int) $statement->fetchColumn();
    }
}
