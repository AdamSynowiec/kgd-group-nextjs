<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Exception\NotFoundException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\CollectionItemRepositoryInterface;
use App\Support\EditableMerge;
use App\Support\Slug;
use JsonException;
use PDOException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * API panelu edycji dla "kolekcji" (patrz CollectionItemRepositoryInterface)
 * — mirror AdminController, rozszerzony o to, czego strony nigdy nie
 * potrzebowały: tworzenie i usuwanie elementów z panelu. Każda trasa wymaga
 * ?collection=... w query (patrz backend/admin.php).
 *
 * "status"/"publishedAt" są PRAWDZIWYMI kolumnami SQL, nie polami w JSON-ie
 * treści (patrz db/007_create_collection_items_table.sql) — dlatego
 * saveItem() przyjmuje je jako osobne pola w body, nie jako część "content".
 */
final class CollectionAdminController
{
    public function __construct(private readonly CollectionItemRepositoryInterface $items)
    {
    }

    /** GET /collection-items?collection=blog — wszystkie elementy (też szkice) pod listę w panelu. */
    public function listItems(Request $request): void
    {
        JsonResponse::ok($this->items->listAll($this->collectionFromQuery($request)));
    }

    /** GET /collection-item?collection=blog&slug=moj-wpis — pełna treść jednego elementu do edycji. */
    public function getItem(Request $request): void
    {
        $collection = $this->collectionFromQuery($request);
        $slug = $this->slugFromQuery($request);

        $item = $this->items->findBySlug($collection, $slug);
        if ($item === null) {
            throw new NotFoundException("Nie znaleziono elementu \"{$collection}\" o slugu: {$slug}");
        }

        JsonResponse::ok($item);
    }

    /**
     * POST /collection-items?collection=blog, body: {"slug": "...", "content": {...}}
     * Tworzy nowy element ze statusem "draft". "content" to zwykle
     * CollectionDefinition.blankContent(title) z src/lib/collections/registry.ts —
     * ale backend niczego nie wymusza co do jej kształtu poza tym, że to obiekt.
     */
    public function createItem(Request $request): void
    {
        $collection = $this->collectionFromQuery($request);

        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }

        $rawSlug = is_string($body['slug'] ?? null) ? $body['slug'] : '';
        $slug = self::singleSlugSegment($rawSlug);
        if ($slug === null) {
            throw new ApiException('Slug musi być pojedynczym segmentem kebab-case (np. "moj-wpis").', 400);
        }

        if ($slug === 'page') {
            // Zarezerwowane pod /blog/page/2, /blog/page/3... (paginacja) — patrz src/app/(site)/blog/page/[n]/page.tsx.
            throw new ApiException('Slug "page" jest zarezerwowany dla paginacji listy.', 400);
        }

        $content = $body['content'] ?? null;
        if (!is_array($content)) {
            throw new ApiException('Brak wymaganego pola "content".', 400);
        }

        try {
            $created = $this->items->create($collection, $slug, $content);
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                throw new ApiException('Element o tym slugu już istnieje w tej kolekcji.', 409);
            }

            throw $exception;
        }

        JsonResponse::ok($created);
    }

    /**
     * POST /collection-item?collection=blog&slug=moj-wpis
     * body: {"content": {...zmiany z formularza...}, "status": "draft"|"published", "publishedAt": "YYYY-MM-DD"|null}
     *
     * "content" idzie przez EditableMerge::apply() dokładnie jak w savePage —
     * ten sam mechanizm walidacji względem "type", ta sama zasada "tylko
     * editable:true node'y są w ogóle zmienialne".
     */
    public function saveItem(Request $request): void
    {
        $collection = $this->collectionFromQuery($request);
        $slug = $this->slugFromQuery($request);

        try {
            $body = $request->jsonBody();
        } catch (JsonException $exception) {
            throw new ApiException("Niepoprawny JSON: {$exception->getMessage()}", 400);
        }

        $current = $this->items->findBySlug($collection, $slug);
        if ($current === null) {
            throw new NotFoundException("Nie znaleziono elementu \"{$collection}\" o slugu: {$slug}");
        }

        $incomingContent = $body['content'] ?? null;
        $merged = is_array($incomingContent)
            ? EditableMerge::apply($current['content'], $incomingContent)
            : $current['content'];

        $status = in_array($body['status'] ?? null, ['draft', 'published'], true) ? $body['status'] : $current['status'];
        $publishedAt = array_key_exists('publishedAt', $body)
            ? (is_string($body['publishedAt']) ? $body['publishedAt'] : null)
            : $current['publishedAt'];

        $this->items->save($collection, $slug, $merged, $status, $publishedAt);

        JsonResponse::ok(['saved' => true, 'slug' => $slug, 'status' => $status, 'publishedAt' => $publishedAt]);
    }

    /** DELETE /collection-item?collection=blog&slug=moj-wpis */
    public function deleteItem(Request $request): void
    {
        $collection = $this->collectionFromQuery($request);
        $slug = $this->slugFromQuery($request);

        $this->items->delete($collection, $slug);

        JsonResponse::ok(['deleted' => true, 'slug' => $slug]);
    }

    private function collectionFromQuery(Request $request): string
    {
        $raw = $request->query['collection'] ?? null;

        if (!is_string($raw) || preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $raw) !== 1) {
            throw new ApiException('Brak lub nieprawidłowy parametr "collection".', 400);
        }

        return $raw;
    }

    private function slugFromQuery(Request $request): string
    {
        $raw = $request->query['slug'] ?? null;
        $slug = self::singleSlugSegment(is_string($raw) ? $raw : '');

        if ($slug === null) {
            throw new ApiException('Brak lub nieprawidłowy parametr "slug".', 400);
        }

        return $slug;
    }

    /**
     * Slug elementu kolekcji to POJEDYNCZY segment kebab-case (nie pełna
     * ścieżka jak w Slug::fromSegments — "collection" już jest osobnym
     * parametrem, więc nie ma tu wielosegmentowego zagnieżdżenia jak w
     * "/inwestycja/x/y"). Zwraca null, jeśli wejście nie jest dokładnie
     * jednym poprawnym segmentem.
     */
    private static function singleSlugSegment(string $raw): ?string
    {
        $segments = array_values(array_filter(
            explode('/', trim($raw, '/')),
            static fn (string $segment): bool => $segment !== ''
        ));

        if (count($segments) !== 1 || !Slug::isValid('/' . $segments[0])) {
            return null;
        }

        return $segments[0];
    }
}
