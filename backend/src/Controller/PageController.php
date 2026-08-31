<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\NotFoundException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\PageRepositoryInterface;
use App\Support\Slug;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Jedyne miejsce tłumaczące żądanie HTTP na wywołanie repozytorium i z powrotem na odpowiedź JSON. */
final class PageController
{
    private const SLUG_PREFIX = '/page';

    public function __construct(private readonly PageRepositoryInterface $pages)
    {
    }

    /**
     * ?route=/page                     -> slug "/"
     * ?route=/page/link1/link2/link3   -> slug "/link1/link2/link3"
     */
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

        JsonResponse::ok($page['content'], ['slug' => $page['slug'], 'updatedAt' => $page['updatedAt']]);
    }

    /** ?route=/pages — lekka lista opublikowanych stron, np. pod nawigację albo sitemapę. */
    public function index(Request $request): void
    {
        JsonResponse::ok($this->pages->listPublished());
    }
}
