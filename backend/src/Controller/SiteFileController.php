<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Exception\NotFoundException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\ActivityLogRepositoryInterface;
use App\Repository\MysqlSiteFileRepository;
use App\Support\SiteFiles;
use JsonException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Pliki serwisu (robots.txt, …) — rejestr: backend/src/Support/SiteFiles.php.
 *   index.php  GET  /site-file/<nazwa>  treść dla builda Next.js (content: null = plik domyślny),
 *   admin.php  GET  /site-files         lista do panelu (Ustawienia → Pliki serwisu),
 *              POST /site-files         {"name": "robots.txt", "content": "..."} — pusta treść przywraca domyślny.
 */
final class SiteFileController
{
    private const PUBLIC_PREFIX = '/site-file';

    public function __construct(
        private readonly MysqlSiteFileRepository $files,
        private readonly ?ActivityLogRepositoryInterface $activity = null
    ) {
    }

    public function show(Request $request): void
    {
        $name = implode('/', $request->segmentsAfter(self::PUBLIC_PREFIX));
        if (!SiteFiles::exists($name)) {
            throw new NotFoundException("Nie ma pliku serwisu: {$name}");
        }

        JsonResponse::ok(['name' => $name, 'content' => $this->files->findIfInstalled($name)['content'] ?? null]);
    }

    public function list(): void
    {
        $list = [];
        foreach (array_keys(SiteFiles::FILES) as $name) {
            $record = $this->files->find($name);
            $list[] = ['name' => $name, 'content' => $record['content'] ?? null, 'updatedBy' => $record['updatedBy'] ?? null, 'updatedAt' => $record['updatedAt'] ?? null];
        }

        JsonResponse::ok(['files' => $list]);
    }

    /** @param array{userId: int, login: string, role: string, exp: int}|null $session */
    public function save(Request $request, ?array $session): void
    {
        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }

        $name = is_string($body['name'] ?? null) ? $body['name'] : '';
        if (!SiteFiles::exists($name)) {
            throw new ApiException('Nieznany plik serwisu.', 404);
        }
        $content = SiteFiles::normalize($name, $body['content'] ?? '');

        $this->files->save($name, $content, $session['login'] ?? null);
        $this->activity?->log($session['userId'] ?? null, $session['login'] ?? null, 'site.files.update', $name, ['default' => $content === null]);

        $record = $this->files->find($name);
        JsonResponse::ok(['name' => $name, 'content' => $record['content'] ?? null, 'updatedBy' => $record['updatedBy'] ?? null, 'updatedAt' => $record['updatedAt'] ?? null]);
    }
}
