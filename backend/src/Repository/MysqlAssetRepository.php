<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Biblioteka plików (tabele assets + asset_folders, db/034_create_assets.sql).
 * Katalogi są tylko porządkiem w bazie — plik na dysku (api/uploads/<filename>) nigdy się nie przenosi.
 *
 * Kształt folderu: {id, parentId, name, count}; kształt pliku: {id, filename, name, folderId, mime, size,
 * width, height, uploadedBy, createdAt (ISO 8601)}.
 */
final class MysqlAssetRepository
{
    public function __construct(private readonly PDO $pdo)
    {
    }

    // --- Katalogi -----------------------------------------------------------------

    /** @return list<array{id: int, parentId: ?int, name: string, count: int}> wszystkie katalogi (drzewo buduje panel) */
    public function folders(): array
    {
        $rows = $this->pdo->query(
            'SELECT f.id, f.parent_id, f.name, (SELECT COUNT(*) FROM assets a WHERE a.folder_id = f.id) AS count '
            . 'FROM asset_folders f ORDER BY f.name'
        )->fetchAll(PDO::FETCH_ASSOC);

        return array_map(static fn (array $row): array => [
            'id' => (int) $row['id'],
            'parentId' => $row['parent_id'] !== null ? (int) $row['parent_id'] : null,
            'name' => (string) $row['name'],
            'count' => (int) $row['count'],
        ], $rows);
    }

    /** @return array{id: int, parentId: ?int, name: string}|null */
    public function folder(int $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT id, parent_id, name FROM asset_folders WHERE id = :id');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : ['id' => (int) $row['id'], 'parentId' => $row['parent_id'] !== null ? (int) $row['parent_id'] : null, 'name' => (string) $row['name']];
    }

    public function folderNameTaken(?int $parentId, string $name, ?int $exceptId = null): bool
    {
        $statement = $this->pdo->prepare(
            'SELECT COUNT(*) FROM asset_folders WHERE parent_id <=> :parent AND LOWER(name) = LOWER(:name) AND id <> :except'
        );
        $statement->execute(['parent' => $parentId, 'name' => $name, 'except' => $exceptId ?? 0]);

        return (int) $statement->fetchColumn() > 0;
    }

    public function createFolder(?int $parentId, string $name): int
    {
        $this->pdo->prepare('INSERT INTO asset_folders (parent_id, name) VALUES (:parent, :name)')->execute(['parent' => $parentId, 'name' => $name]);

        return (int) $this->pdo->lastInsertId();
    }

    public function updateFolder(int $id, string $name, ?int $parentId): void
    {
        $this->pdo->prepare('UPDATE asset_folders SET name = :name, parent_id = :parent WHERE id = :id')
            ->execute(['id' => $id, 'name' => $name, 'parent' => $parentId]);
    }

    /** Czy $folderId leży wewnątrz $ancestorId (albo nim jest) — chroni przed przeniesieniem katalogu do własnego środka. */
    public function isWithin(int $folderId, int $ancestorId): bool
    {
        $current = $folderId;
        for ($depth = 0; $current !== null && $depth < 100; $depth++) {
            if ($current === $ancestorId) {
                return true;
            }
            $current = $this->folder($current)['parentId'] ?? null;
        }

        return false;
    }

    /** Usuwa katalog; jego pliki i podkatalogi przechodzą piętro wyżej (nic nie znika z dysku). */
    public function deleteFolder(int $id): void
    {
        $parent = $this->folder($id)['parentId'] ?? null;
        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare('UPDATE assets SET folder_id = :parent WHERE folder_id = :id')->execute(['parent' => $parent, 'id' => $id]);
            $this->pdo->prepare('UPDATE asset_folders SET parent_id = :parent WHERE parent_id = :id')->execute(['parent' => $parent, 'id' => $id]);
            $this->pdo->prepare('DELETE FROM asset_folders WHERE id = :id')->execute(['id' => $id]);
            $this->pdo->commit();
        } catch (\Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    // --- Pliki ----------------------------------------------------------------------

    /**
     * Pliki jednego katalogu (null = najwyższy poziom), a z $query — wyszukiwanie po nazwie we wszystkich.
     *
     * @return list<array<string, mixed>>
     */
    public function assets(?int $folderId, string $query = ''): array
    {
        if ($query !== '') {
            $statement = $this->pdo->prepare('SELECT *, UNIX_TIMESTAMP(created_at) AS created_ts FROM assets WHERE name LIKE :q1 OR filename LIKE :q2 ORDER BY created_at DESC, id DESC LIMIT 500');
            $needle = '%' . addcslashes($query, '%_\\') . '%';
            $statement->execute(['q1' => $needle, 'q2' => $needle]);
        } else {
            $statement = $this->pdo->prepare('SELECT *, UNIX_TIMESTAMP(created_at) AS created_ts FROM assets WHERE folder_id <=> :folder ORDER BY created_at DESC, id DESC');
            $statement->execute(['folder' => $folderId]);
        }

        return array_map([self::class, 'map'], $statement->fetchAll(PDO::FETCH_ASSOC));
    }

    /** @return array<string, mixed>|null */
    public function find(int $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT *, UNIX_TIMESTAMP(created_at) AS created_ts FROM assets WHERE id = :id');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);

        return $row === false ? null : self::map($row);
    }

    /** @return string[] nazwy plików na dysku, które biblioteka już zna */
    public function knownFilenames(): array
    {
        return array_map('strval', $this->pdo->query('SELECT filename FROM assets')->fetchAll(PDO::FETCH_COLUMN));
    }

    /** @param array{filename: string, name: string, folderId: ?int, mime: ?string, size: int, width: ?int, height: ?int, uploadedBy: ?string, createdAt?: ?int} $asset */
    public function insert(array $asset): int
    {
        $this->pdo->prepare(
            'INSERT INTO assets (filename, name, folder_id, mime, size, width, height, uploaded_by, created_at) '
            . 'VALUES (:filename, :name, :folder, :mime, :size, :width, :height, :by, FROM_UNIXTIME(:created))'
        )->execute([
            'filename' => $asset['filename'],
            'name' => $asset['name'],
            'folder' => $asset['folderId'],
            'mime' => $asset['mime'],
            'size' => $asset['size'],
            'width' => $asset['width'],
            'height' => $asset['height'],
            'by' => $asset['uploadedBy'],
            'created' => $asset['createdAt'] ?? time(),
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function rename(int $id, string $name): void
    {
        $this->pdo->prepare('UPDATE assets SET name = :name WHERE id = :id')->execute(['id' => $id, 'name' => $name]);
    }

    /** @param int[] $ids */
    public function move(array $ids, ?int $folderId): void
    {
        $statement = $this->pdo->prepare('UPDATE assets SET folder_id = :folder WHERE id = :id');
        foreach ($ids as $id) {
            $statement->execute(['folder' => $folderId, 'id' => $id]);
        }
    }

    public function delete(int $id): void
    {
        $this->pdo->prepare('DELETE FROM assets WHERE id = :id')->execute(['id' => $id]);
    }

    /** @return string[] slugi stron, w których treści występuje nazwa pliku */
    public function usage(string $filename): array
    {
        $statement = $this->pdo->prepare('SELECT slug FROM pages WHERE CAST(content AS CHAR) LIKE :needle ORDER BY slug');
        $statement->execute(['needle' => '%' . addcslashes($filename, '%_\\') . '%']);

        return array_map('strval', $statement->fetchAll(PDO::FETCH_COLUMN));
    }

    /** Oryginalna nazwa pliku wgranego przed biblioteką — z historii aktywności (assets.upload). */
    public function originalNameFromLog(string $filename): ?string
    {
        try {
            $statement = $this->pdo->prepare(
                "SELECT JSON_UNQUOTE(JSON_EXTRACT(details, '$.originalName')) FROM activity_log "
                . "WHERE action = 'assets.upload' AND target = :filename ORDER BY id LIMIT 1"
            );
            $statement->execute(['filename' => $filename]);
            $row = $statement->fetch(PDO::FETCH_NUM);
        } catch (\Throwable) {
            return null;
        }

        return $row === false || $row[0] === null || $row[0] === 'null' ? null : (string) $row[0];
    }

    /** @param array<string, mixed> $row */
    private static function map(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'filename' => (string) $row['filename'],
            'url' => '/api/uploads/' . $row['filename'],
            'name' => (string) $row['name'],
            'folderId' => $row['folder_id'] !== null ? (int) $row['folder_id'] : null,
            'mime' => $row['mime'] !== null ? (string) $row['mime'] : null,
            'size' => (int) $row['size'],
            'width' => $row['width'] !== null ? (int) $row['width'] : null,
            'height' => $row['height'] !== null ? (int) $row['height'] : null,
            'uploadedBy' => $row['uploaded_by'] !== null ? (string) $row['uploaded_by'] : null,
            'createdAt' => gmdate('c', (int) $row['created_ts']),
        ];
    }
}
