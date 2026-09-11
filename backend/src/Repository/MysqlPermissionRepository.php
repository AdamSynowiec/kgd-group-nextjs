<?php

declare(strict_types=1);

namespace App\Repository;

use App\Support\PermissionRegistry;
use PDO;
use Throwable;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Implementacja PermissionRepositoryInterface na tabelach "role_permissions"/"user_permission_denies" (patrz db/011_create_permission_tables.sql). */
final class MysqlPermissionRepository implements PermissionRepositoryInterface
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    public function effectiveHas(int $userId, string $role, string $permission): bool
    {
        $deny = $this->pdo->prepare(
            'SELECT 1 FROM user_permission_denies WHERE user_id = :userId AND permission = :permission LIMIT 1'
        );
        $deny->execute(['userId' => $userId, 'permission' => $permission]);
        if ($deny->fetchColumn() !== false) {
            return false;
        }

        $grant = $this->pdo->prepare(
            "SELECT 1 FROM role_permissions WHERE role_name = :role AND permission IN (:permission, '*') LIMIT 1"
        );
        $grant->execute(['role' => $role, 'permission' => $permission]);

        return $grant->fetchColumn() !== false;
    }

    public function effectivePermissions(int $userId, string $role): array
    {
        $statement = $this->pdo->prepare('SELECT permission FROM role_permissions WHERE role_name = :role');
        $statement->execute(['role' => $role]);
        /** @var list<string> $granted */
        $granted = $statement->fetchAll(PDO::FETCH_COLUMN);

        if (in_array('*', $granted, true)) {
            return ['*'];
        }

        $denies = $this->userDenies($userId);

        return array_values(array_diff($granted, $denies));
    }

    public function roleGrants(): array
    {
        $statement = $this->pdo->query('SELECT role_name, permission FROM role_permissions ORDER BY role_name, permission');

        $result = [];
        foreach ($statement as $row) {
            $result[(string) $row['role_name']][] = (string) $row['permission'];
        }

        return $result;
    }

    public function setRoleGrants(string $roleName, array $permissions): void
    {
        $this->pdo->beginTransaction();

        try {
            $delete = $this->pdo->prepare('DELETE FROM role_permissions WHERE role_name = :role');
            $delete->execute(['role' => $roleName]);

            $insert = $this->pdo->prepare('INSERT INTO role_permissions (role_name, permission) VALUES (:role, :permission)');
            foreach (array_unique($permissions) as $permission) {
                $insert->execute(['role' => $roleName, 'permission' => $permission]);
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function userDenies(int $userId): array
    {
        $statement = $this->pdo->prepare('SELECT permission FROM user_permission_denies WHERE user_id = :userId ORDER BY permission');
        $statement->execute(['userId' => $userId]);

        /** @var list<string> */
        return $statement->fetchAll(PDO::FETCH_COLUMN);
    }

    public function addDeny(int $userId, string $permission): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO user_permission_denies (user_id, permission) VALUES (:userId, :permission) '
            . 'ON DUPLICATE KEY UPDATE permission = VALUES(permission)'
        );
        $statement->execute(['userId' => $userId, 'permission' => $permission]);
    }

    public function removeDeny(int $userId, string $permission): void
    {
        $statement = $this->pdo->prepare(
            'DELETE FROM user_permission_denies WHERE user_id = :userId AND permission = :permission'
        );
        $statement->execute(['userId' => $userId, 'permission' => $permission]);
    }

    public function countActiveAdmins(): int
    {
        $critical = PermissionRegistry::CRITICAL;
        $placeholders = implode(',', array_fill(0, count($critical), '?'));

        $statement = $this->pdo->prepare(
            "SELECT COUNT(*) FROM users u WHERE u.role = 'admin' AND NOT EXISTS ("
            . 'SELECT 1 FROM user_permission_denies d WHERE d.user_id = u.id '
            . "AND d.permission IN ({$placeholders})"
            . ')'
        );
        $statement->execute($critical);

        return (int) $statement->fetchColumn();
    }
}
