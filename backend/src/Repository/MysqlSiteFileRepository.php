<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;
use PDOException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Pliki serwisu edytowane w panelu (tabela site_files, db/038_create_site_files.sql).
 * Kształt rekordu: {name, content, updatedBy, updatedAt}. Brak wiersza = plik domyślny.
 */
final class MysqlSiteFileRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    /** @return array{name: string, content: string, updatedBy: ?string, updatedAt: string}|null */
    public function find(string $name): ?array
    {
        $statement = $this->pdo->prepare('SELECT name, content, updated_by, updated_at FROM site_files WHERE name = :name');
        $statement->execute(['name' => $name]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : self::map($row);
    }

    /**
     * Jak find(), ale bez tabeli (migracja 038 jeszcze nieuruchomiona) zwraca null zamiast błędu —
     * publiczne API czyta to w czasie builda, a brak własnej treści oznacza po prostu plik domyślny.
     *
     * @return array{name: string, content: string, updatedBy: ?string, updatedAt: string}|null
     */
    public function findIfInstalled(string $name): ?array
    {
        try {
            return $this->find($name);
        } catch (PDOException $exception) {
            if ($exception->getCode() === '42S02') {
                return null;
            }
            throw $exception;
        }
    }

    /** null = usuń własną treść (powrót do pliku domyślnego). */
    public function save(string $name, ?string $content, ?string $updatedBy): void
    {
        if ($content === null) {
            $this->pdo->prepare('DELETE FROM site_files WHERE name = :name')->execute(['name' => $name]);
            return;
        }
        $this->pdo->prepare(
            'INSERT INTO site_files (name, content, updated_by) VALUES (:name, :content, :by) '
            . 'ON DUPLICATE KEY UPDATE content = VALUES(content), updated_by = VALUES(updated_by)'
        )->execute(['name' => $name, 'content' => $content, 'by' => $updatedBy]);
    }

    /** @param array<string, mixed> $row */
    private static function map(array $row): array
    {
        return [
            'name' => (string) $row['name'],
            'content' => (string) $row['content'],
            'updatedBy' => $row['updated_by'] !== null ? (string) $row['updated_by'] : null,
            'updatedAt' => date(DATE_ATOM, strtotime((string) $row['updated_at'])),
        ];
    }
}
