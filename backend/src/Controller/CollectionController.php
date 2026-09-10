<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Exception\NotFoundException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\CollectionItemRepositoryInterface;
use App\Support\Slug;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * API publiczne dla "kolekcji" (patrz CollectionItemRepositoryInterface) —
 * mirror PageController, ale jedna trasa obsługuje DWA tryby zależnie od
 * liczby segmentów po prefiksie:
 *
 *   ?route=/collection/blog                    -> lista opublikowanych (stronicowana)
 *   ?route=/collection/blog/moj-pierwszy-wpis   -> pojedynczy element
 *
 * Tak jak strony: findBySlug() nie filtruje statusu — w praktyce nieistotne,
 * bo przy w pełni statycznym eksporcie generateStaticParams() bierze slugi
 * WYŁĄCZNIE z listPublished(), więc szkic nigdy nie dostaje wygenerowanej
 * ścieżki (patrz PageController — ten sam wzorzec).
 */
final class CollectionController
{
    private const PREFIX = '/collection';
    private const DEFAULT_PAGE_SIZE = 10;
    private const MAX_PAGE_SIZE = 100;

    public function __construct(private readonly CollectionItemRepositoryInterface $items)
    {
    }

    public function show(Request $request): void
    {
        $segments = $request->segmentsAfter(self::PREFIX);

        if ($segments === []) {
            throw new ApiException('Brak nazwy kolekcji w adresie.', 400);
        }

        $collection = array_shift($segments);
        if (!self::isValidCollectionKey($collection)) {
            throw new ApiException("Nieprawidłowa nazwa kolekcji: {$collection}", 400);
        }

        if ($segments === []) {
            $this->list($request, $collection);
            return;
        }

        // Slug elementu kolekcji to POJEDYNCZY segment (patrz CollectionAdminController::singleSlugSegment)
        // — "collection" już jest osobnym segmentem, więc więcej niż jeden dodatkowy segment to zły adres.
        if (count($segments) !== 1 || !Slug::isValid('/' . $segments[0])) {
            throw new NotFoundException('Nieprawidłowy adres elementu: /' . implode('/', $segments));
        }
        $slug = $segments[0];

        $item = $this->items->findBySlug($collection, $slug);
        if ($item === null) {
            throw new NotFoundException("Nie znaleziono elementu \"{$collection}\" pod adresem: {$slug}");
        }

        JsonResponse::ok($item['content'], [
            'slug' => $item['slug'],
            'publishedAt' => $item['publishedAt'],
            'updatedAt' => $item['updatedAt'],
        ]);
    }

    /**
     * ?page= (domyślnie 1) i ?pageSize= (domyślnie 10, max 100 — wołający,
     * czyli src/lib/collections.ts, przekazuje własny rozmiar strony z
     * rejestru kolekcji; backend nie zna i nie musi znać konfiguracji
     * konkretnej kolekcji, tylko liczby).
     */
    private function list(Request $request, string $collection): void
    {
        $page = max(1, (int) ($request->query['page'] ?? '1'));
        $pageSize = (int) ($request->query['pageSize'] ?? (string) self::DEFAULT_PAGE_SIZE);
        $pageSize = max(1, min(self::MAX_PAGE_SIZE, $pageSize));

        $total = $this->items->countPublished($collection);
        $totalPages = max(1, (int) ceil($total / $pageSize));

        $items = $this->items->listPublished($collection, $pageSize, ($page - 1) * $pageSize);

        // Spłaszczone tak samo jak pojedynczy element (show()) — "slug"/"publishedAt"
        // dokładają się do pól treści, żeby wywołujący nie musiał godzić dwóch
        // kształtów (pojedynczy element vs. wpis na liście).
        $flattened = array_map(
            static fn (array $item): array => [...$item['content'], 'slug' => $item['slug'], 'publishedAt' => $item['publishedAt']],
            $items
        );

        JsonResponse::ok($flattened, [
            'page' => $page,
            'pageSize' => $pageSize,
            'total' => $total,
            'totalPages' => $totalPages,
        ]);
    }

    private static function isValidCollectionKey(string $collection): bool
    {
        return preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $collection) === 1;
    }
}
