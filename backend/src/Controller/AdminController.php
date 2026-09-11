<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Exception\NotFoundException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\PageRepositoryInterface;
use App\Support\Acl;
use App\Support\EditableMerge;
use App\Support\Slug;
use JsonException;
use PDOException;

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

    /**
     * GET /pages — lista wszystkich stron (też szkiców) pod panel, tylko te,
     * które $currentSession['role'] wolno CZYTAĆ (patrz Acl::canRead — rola
     * "admin" widzi zawsze wszystko). "acl" strony jest tu potrzebne tylko do
     * filtrowania, więc znika z odpowiedzi zanim trafi do panelu.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function listPages(?array $currentSession): void
    {
        $role = $currentSession['role'] ?? null;

        $pages = array_values(array_filter(
            $this->pages->listAll(),
            static fn (array $page): bool => Acl::canRead($page['acl'] ?? null, $role)
        ));

        $pages = array_map(static function (array $page): array {
            unset($page['acl']);
            return $page;
        }, $pages);

        JsonResponse::ok($pages);
    }

    /**
     * GET /page?slug=/o-nas — pełna treść jednej strony do edycji. 403, gdy
     * ACL strony nie pozwala tej roli na odczyt (patrz Acl::canRead) — bez
     * tego panel dostałby treść, której nie powinien nawet zobaczyć, a samo
     * ukrycie jej z listy (listPages) nie wystarczy, gdy ktoś zna slug.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function getPage(Request $request, ?array $currentSession): void
    {
        $slug = $this->slugFromQuery($request);
        $page = $this->pages->findBySlug($slug);

        if ($page === null) {
            throw new NotFoundException("Nie znaleziono strony dla adresu: {$slug}");
        }

        $role = $currentSession['role'] ?? null;
        if (!Acl::canRead($page['content']['acl'] ?? null, $role)) {
            throw new ApiException('Brak uprawnień do tej strony.', 403);
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
     *
     * ACL strony sprawdzane jest NAJPIERW, zanim EditableMerge w ogóle
     * zobaczy treść — rola bez prawa zapisu do całej strony nie może jej
     * zmienić, nawet gdyby pojedyncze pole miało własne acl:{permission:"write"}
     * (strona ma pierwszeństwo). Rola z prawem zapisu do strony, ale nie do
     * konkretnego pola, nadal przechodzi tutaj — EditableMerge::apply($role)
     * dopiero potem odrzuca zmiany tego konkretnego pola.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function savePage(Request $request, ?array $currentSession): void
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

        $role = $currentSession['role'] ?? null;
        if (!Acl::canWrite($current['content']['acl'] ?? null, $role)) {
            throw new ApiException('Brak uprawnień do zapisu tej strony.', 403);
        }

        $merged = EditableMerge::apply($current['content'], $incoming, $role);

        // "status"/"updatedAt" to strukturalne metadane strony (jak "parent"/"template"),
        // nie węzły {value,editable} — EditableMerge::apply() celowo je pomija (patrz
        // komentarz w EditableMerge.php). W odróżnieniu od "parent"/"template" redaktor
        // MUSI móc je zmieniać (draft/publikacja, widoczna data — patrz PageEditor.tsx),
        // więc nadpisywane są wprost z incoming, gdy przyszły jako poprawne wartości —
        // reszta struktury nietknięta przez EditableMerge jak zawsze.
        if (in_array($incoming['status'] ?? null, ['draft', 'published'], true)) {
            $merged['status'] = $incoming['status'];
        }
        if (is_string($incoming['updatedAt'] ?? null) && $incoming['updatedAt'] !== '') {
            $merged['updatedAt'] = $incoming['updatedAt'];
        }

        $this->pages->save($slug, $merged);

        JsonResponse::ok(['saved' => true, 'slug' => $slug]);
    }

    /**
     * POST /pages, body: {"slug": "/blog/moj-wpis", "content": {...}}
     * Tworzy nową stronę. "content" to zwykle PageTemplate.blankContent(...)
     * z src/lib/pageTemplates.ts — backend niczego nie wymusza co do jej
     * kształtu poza tym, że to obiekt (mirror dawnego
     * CollectionAdminController::createItem()).
     */
    public function createPage(Request $request): void
    {
        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }

        $rawSlug = is_string($body['slug'] ?? null) ? $body['slug'] : '';
        $slug = Slug::fromSegments(explode('/', trim($rawSlug, '/')));

        if (!Slug::isValid($slug)) {
            throw new ApiException('Nieprawidłowy adres strony.', 400);
        }

        // Zarezerwowane pod /blog/page/2, /blog/page/3... (paginacja) — patrz src/app/blog/page/[n]/page.tsx.
        if ($slug === '/blog/page') {
            throw new ApiException('Adres "/blog/page" jest zarezerwowany dla paginacji listy.', 400);
        }

        $content = $body['content'] ?? null;
        if (!is_array($content)) {
            throw new ApiException('Brak wymaganego pola "content".', 400);
        }

        try {
            $created = $this->pages->create($slug, $content);
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                throw new ApiException('Strona o tym adresie już istnieje.', 409);
            }

            throw $exception;
        }

        JsonResponse::ok($created);
    }

    /**
     * DELETE /page?slug=/blog/moj-wpis — usunięcie traktowane jak zapis:
     * wymaga prawa zapisu do strony (patrz savePage).
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function deletePage(Request $request, ?array $currentSession): void
    {
        $slug = $this->slugFromQuery($request);

        $current = $this->pages->findBySlug($slug);
        if ($current === null) {
            throw new NotFoundException("Nie znaleziono strony do usunięcia: {$slug}");
        }

        $role = $currentSession['role'] ?? null;
        if (!Acl::canWrite($current['content']['acl'] ?? null, $role)) {
            throw new ApiException('Brak uprawnień do usunięcia tej strony.', 403);
        }

        $this->pages->delete($slug);

        JsonResponse::ok(['deleted' => true, 'slug' => $slug]);
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
