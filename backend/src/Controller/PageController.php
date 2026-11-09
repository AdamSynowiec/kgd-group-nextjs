<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\NotFoundException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\PageRepositoryInterface;
use App\Support\Editable;
use App\Support\PageReview;
use App\Support\Slug;
use PDOException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Publiczne API stron (backend/index.php) — z niego czyta build Next.js (src/lib/content.ts).
 * Strona z niezatwierdzonymi zmianami edytora jest podawana w wersji zatwierdzonej
 * (PageReview.php), nowa niezatwierdzona strona — nie istnieje. Bez tabel db/042 (PDOException)
 * — jak dotąd, obecna treść.
 */
final class PageController
{
    private const SLUG_PREFIX = '/page';

    public function __construct(
        private readonly PageRepositoryInterface $pages,
        private readonly ?PageReview $review = null
    ) {
    }

    public function show(Request $request): void
    {
        $slug = Slug::fromSegments($request->segmentsAfter(self::SLUG_PREFIX));

        if (!Slug::isValid($slug)) {
            throw new NotFoundException("Nieprawidłowy adres: {$slug}");
        }

        $page = $this->pages->findBySlug($slug);

        if ($page === null) {
            throw new NotFoundException("Nie znaleziono strony dla adresu: {$slug}");
        }

        $content = $page['content'];
        if ($this->review !== null) {
            try {
                $content = $this->review->publicContent($slug, $content);
            } catch (PDOException $exception) {
                error_log('[page-review] ' . $exception->getMessage());
            }
        }
        if ($content === null) {
            throw new NotFoundException("Nie znaleziono strony dla adresu: {$slug}");
        }

        JsonResponse::ok($content, ['slug' => $page['slug'], 'updatedAt' => $page['updatedAt']]);
    }

    public function index(Request $request): void
    {
        $list = $this->pages->listPublished();

        $approved = [];
        if ($this->review !== null) {
            try {
                $approved = $this->review->allApproved();
            } catch (PDOException $exception) {
                error_log('[page-review] ' . $exception->getMessage());
            }
        }
        if ($approved === []) {
            JsonResponse::ok($list);

            return;
        }

        // Strony z niezatwierdzonymi zmianami: status, tytuł i rodzic z wersji zatwierdzonej.
        $list = array_values(array_filter($list, static fn (array $page): bool => !array_key_exists($page['slug'], $approved)));
        $all = [];
        foreach ($this->pages->listAll() as $row) {
            $all[$row['slug']] = $row;
        }
        foreach ($approved as $slug => $content) {
            if ($content === null || ($content['status'] ?? 'published') !== 'published' || !isset($all[$slug])) {
                continue;
            }
            $title = Editable::unwrap($content['title'] ?? null);
            $list[] = [
                'slug' => $slug,
                'title' => is_string($title) && $title !== '' ? $title : $slug,
                'parent' => is_string($content['parent'] ?? null) ? $content['parent'] : null,
                'updatedAt' => $all[$slug]['updatedAt'],
                'createdAt' => $all[$slug]['createdAt'],
            ];
        }
        usort($list, static fn (array $a, array $b): int => strcmp((string) $a['slug'], (string) $b['slug']));

        JsonResponse::ok($list);
    }
}
