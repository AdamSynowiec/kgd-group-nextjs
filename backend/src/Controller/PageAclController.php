<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\ActivityLogRepositoryInterface;
use App\Repository\PageRepositoryInterface;
use App\Repository\RoleRepositoryInterface;
use App\Support\Acl;
use JsonException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Dostęp ról do stron ("acl" strony, patrz Acl.php) — panel: Strony → "Dostęp".
 * Strona może mieć kilka wpisów {"role", "permission"}; brak wpisów = tylko admin.
 * Rola "admin" ma zawsze pełny dostęp, więc nie jest zapisywana w "acl".
 * Trasy wymagają uprawnienia "roles.permissions.manage" (admin.php).
 */
final class PageAclController
{
    public function __construct(
        private readonly PageRepositoryInterface $pages,
        private readonly RoleRepositoryInterface $roles,
        private readonly ActivityLogRepositoryInterface $activity
    ) {
    }

    /** GET /page-acl — "acl" wszystkich stron: [{"slug": "/o-nas", "acl": [{"role", "permission"}]}]. */
    public function list(): void
    {
        $items = array_map(
            static fn (array $page): array => ['slug' => (string) $page['slug'], 'acl' => Acl::entries($page['acl'] ?? null)],
            $this->pages->listAll()
        );

        JsonResponse::ok($items);
    }

    /**
     * POST /page-acl  body: {"slugs": ["/inwestycja/foxhills", ...], "acl": [{"role": "editor", "permission": "read/write"}]}
     * — ustawia ten sam dostęp na wszystkich podanych stronach (np. inwestycja z podstronami).
     * Pusta lista "acl" = strona tylko dla admina.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function save(Request $request, ?array $currentSession): void
    {
        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }

        $slugs = array_values(array_unique(array_filter((array) ($body['slugs'] ?? []), static fn (mixed $slug): bool => is_string($slug) && $slug !== '')));
        if ($slugs === []) {
            throw new ApiException('Brak stron do zmiany ("slugs").', 400);
        }
        if (!is_array($body['acl'] ?? null) || !array_is_list($body['acl'])) {
            throw new ApiException('Pole "acl" musi być listą wpisów {"role", "permission"}.', 400);
        }

        $known = array_column($this->roles->listAll(), 'name');
        $acl = [];
        foreach ($body['acl'] as $index => $entry) {
            if (!Acl::isValid($entry)) {
                throw new ApiException('Wpis ' . ($index + 1) . ': wymagane "role" i "permission" (read, write albo read/write).', 422);
            }
            $role = $entry['role'];
            if ($role === 'admin') {
                continue; // admin ma zawsze pełny dostęp
            }
            if (!in_array($role, $known, true)) {
                throw new ApiException("Nie ma roli \"{$role}\".", 422);
            }
            // Jedna rola = jeden wpis (ostatni wygrywa).
            $acl[$role] = ['role' => $role, 'permission' => $entry['permission']];
        }
        $acl = array_values($acl);

        $pages = [];
        foreach ($slugs as $slug) {
            $page = $this->pages->findBySlug($slug);
            if ($page === null) {
                throw new ApiException("Nie znaleziono strony: {$slug}", 404);
            }
            $pages[$slug] = $page['content'];
        }

        foreach ($pages as $slug => $content) {
            if ($acl === []) {
                unset($content['acl']);
            } else {
                $content['acl'] = $acl;
            }
            $this->pages->save($slug, $content);
        }

        $this->activity->log(
            $currentSession['userId'] ?? null,
            $currentSession['login'] ?? null,
            'pages.acl',
            count($slugs) === 1 ? $slugs[0] : $slugs[0] . ' (+' . (count($slugs) - 1) . ')',
            ['slugs' => $slugs, 'acl' => array_map(static fn (array $entry): string => "{$entry['role']}: {$entry['permission']}", $acl)]
        );

        JsonResponse::ok(['saved' => count($slugs), 'acl' => $acl]);
    }
}
