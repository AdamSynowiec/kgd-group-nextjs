<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Exception\NotFoundException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\PageRepositoryInterface;
use App\Support\EditableMerge;
use App\Support\Slug;
use JsonException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * API panelu edycji (JSON, wołane z /admin w Next.js — patrz src/app/admin/).
 * Nie serwuje żadnego HTML-a — UI jest pełnoprawnym widokiem frontendu, nie
 * plikiem w backendzie.
 */
final class AdminController
{
    public function __construct(private readonly PageRepositoryInterface $pages)
    {
    }

    /** GET /pages — lista wszystkich stron (też szkiców) pod panel. */
    public function listPages(): void
    {
        JsonResponse::ok($this->pages->listAll());
    }

    /** GET /page?slug=/o-nas — pełna treść jednej strony do edycji. */
    public function getPage(Request $request): void
    {
        $slug = $this->slugFromQuery($request);
        $page = $this->pages->findBySlug($slug);

        if ($page === null) {
            throw new NotFoundException("Nie znaleziono strony dla adresu: {$slug}");
        }

        JsonResponse::ok($page['content'], ['slug' => $page['slug'], 'updatedAt' => $page['updatedAt']]);
    }

    /**
     * POST /page?slug=/o-nas, body: treść strony ze zmianami z formularza.
     *
     * Nie zapisuje ciała żądania wprost. EditableMerge::apply() nakłada je na
     * AKTUALNĄ treść z bazy, pole po polu, akceptując zmianę tylko tam, gdzie
     * zapisana wersja ma węzeł {"value": ..., "editable": true} — reszta
     * (structural pola, editable:false, sam znacznik "editable") zostaje
     * dokładnie taka, jak była. Klient nie musi już nawet znać pełnej
     * struktury dokumentu ani przysyłać z powrotem "slug".
     */
    public function savePage(Request $request): void
    {
        $slug = $this->slugFromQuery($request);

        try {
            $incoming = $request->jsonBody();
        } catch (JsonException $exception) {
            throw new ApiException("Niepoprawny JSON: {$exception->getMessage()}", 400);
        }

        $current = $this->pages->findBySlug($slug);
        if ($current === null) {
            throw new NotFoundException("Nie znaleziono strony dla adresu: {$slug}");
        }

        $merged = EditableMerge::apply($current['content'], $incoming);

        $this->pages->save($slug, $merged);

        JsonResponse::ok(['saved' => true, 'slug' => $slug]);
    }

    private function slugFromQuery(Request $request): string
    {
        $raw = $request->query['slug'] ?? null;

        if (!is_string($raw) || $raw === '') {
            throw new ApiException('Brak wymaganego parametru "slug".', 400);
        }

        $slug = Slug::fromSegments(explode('/', trim($raw, '/')));

        if (!Slug::isValid($slug)) {
            throw new ApiException("Nieprawidłowy adres: {$slug}", 400);
        }

        return $slug;
    }
}
