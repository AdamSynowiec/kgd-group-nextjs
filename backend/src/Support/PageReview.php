<?php

declare(strict_types=1);

namespace App\Support;

use App\Exception\ApiException;
use App\Repository\MysqlReviewRepository;
use App\Repository\PageRepositoryInterface;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Akceptacja zmian edytorów — jak przegląd zmian w gicie, ale dla pól stron.
 *
 *  - Zapis strony przez kogoś BEZ "changes.review" (edytor): przed pierwszą zmianą
 *    zapamiętywana jest wersja zatwierdzona strony (page_approved), każde zmienione pole
 *    trafia do historii jako "pending". Publiczne API (backend/index.php -> PageController),
 *    z którego czyta build, podaje wersję zatwierdzoną — więc żaden build nie wypuści
 *    niezatwierdzonych zmian, nawet zwykły przycisk "Zbuduj stronę".
 *  - Admin (z "changes.review") widzi różnice wersja zatwierdzona -> obecna, pole po polu,
 *    i każde pole zatwierdza (trafia do wersji zatwierdzonej) albo cofa (wraca obecna
 *    wartość sprzed zmian). Gdy różnic nie ma — wersja zatwierdzona znika (strona = obecna).
 *  - Zapis admina trafia od razu do wersji zatwierdzonej (jego zmiany nie czekają).
 *  - Nowa strona edytora jest niewidoczna publicznie do zatwierdzenia; usunąć edytor może
 *    tylko taką, jeszcze niezatwierdzoną stronę.
 */
final class PageReview
{
    public function __construct(
        private readonly PageRepositoryInterface $pages,
        private readonly MysqlReviewRepository $review
    ) {
    }

    /**
     * Po zapisie strony z panelu.
     *
     * @param array<string, mixed> $before treść przed zapisem
     * @param array<string, mixed> $after treść zapisana
     */
    public function afterSave(string $slug, array $before, array $after, ?int $userId, ?string $login, bool $reviewer): void
    {
        $changes = ContentDiff::diff($before, $after);
        $approved = $this->review->approved($slug);

        if (!$reviewer) {
            if ($changes === []) {
                return;
            }
            if (!$approved['exists']) {
                $this->review->keepApproved($slug, $before);
            }
            foreach ($changes as $change) {
                $this->review->logChange($slug, $change['key'], $change['label'], $change['old'], $change['new'], $userId, $login);
            }
            $this->settle($slug, $login);

            return;
        }

        // Admin: jego zmiany od razu w wersji zatwierdzonej (także pól, które czekały na akceptację).
        foreach ($changes as $change) {
            $this->review->logChange($slug, $change['key'], $change['label'], $change['old'], $change['new'], $userId, $login, 'approved', $login);
        }
        if ($approved['exists'] && $approved['content'] !== null) {
            $base = $approved['content'];
            foreach ($changes as $change) {
                $base = ContentDiff::withValue($base, $change['path'], $change['new']) ?? $base;
                $this->review->resolve($slug, $change['key'], 'approved', $login);
            }
            $this->review->updateApproved($slug, $base);
        }
        $this->settle($slug, $login);
    }

    /** Po utworzeniu strony: strona edytora czeka na akceptację (publicznie niewidoczna). */
    public function afterCreate(string $slug, ?int $userId, ?string $login, bool $reviewer): void
    {
        if ($reviewer) {
            return;
        }
        $this->review->keepApproved($slug, null);
        $this->review->logChange($slug, ContentDiff::key(['page']), 'Nowa strona', null, $slug, $userId, $login);
    }

    /** Edytor usuwa tylko swoją/niezatwierdzoną nową stronę — opublikowanej nie (to zmiana na żywej stronie). */
    public function assertCanDelete(string $slug, bool $reviewer): void
    {
        if ($reviewer) {
            return;
        }
        $approved = $this->review->approved($slug);
        if (!$approved['exists'] || $approved['content'] !== null) {
            throw new ApiException('Usunięcie strony wymaga akceptacji — poproś administratora.', 403);
        }
    }

    public function afterDelete(string $slug, ?string $login): void
    {
        $this->review->resolve($slug, null, 'reverted', $login);
        $this->review->forgetApproved($slug);
        $this->review->closeResolvedRequests($login);
    }

    /**
     * Treść dla publicznego API: wersja zatwierdzona, gdy strona ma niezatwierdzone zmiany.
     * null = strony publicznie nie ma (nowa, niezatwierdzona).
     *
     * @param array<string, mixed> $current
     * @return array<string, mixed>|null
     */
    public function publicContent(string $slug, array $current): ?array
    {
        $approved = $this->review->approved($slug);

        return $approved['exists'] ? $approved['content'] : $current;
    }

    /** @return array<string, ?array<string, mixed>> */
    public function allApproved(): array
    {
        return $this->review->allApproved();
    }

    /**
     * Przegląd dla admina: strony z niezatwierdzonymi zmianami, pole po polu (wersja
     * zatwierdzona -> obecna) z autorami, prośby o weryfikację i ostatnia historia.
     *
     * @return array<string, mixed>
     */
    public function overview(int $historyLimit = 100): array
    {
        $pending = $this->review->changes('pending', 2000);
        $authors = [];
        foreach ($pending as $row) {
            $authors[$row['slug']][$row['key']][] = $row;
        }

        $pages = [];
        foreach ($this->review->allApproved() as $slug => $approvedContent) {
            $page = $this->pages->findBySlug($slug);
            if ($page === null) {
                $this->review->forgetApproved($slug);
                continue;
            }
            $current = $page['content'];
            $title = Editable::unwrap($current['title'] ?? null);
            $entry = [
                'slug' => $slug,
                'title' => is_string($title) && $title !== '' ? $title : $slug,
                'isNew' => $approvedContent === null,
                'fields' => [],
                'authors' => [],
            ];
            $rows = $authors[$slug] ?? [];
            if ($approvedContent !== null) {
                foreach (ContentDiff::diff($approvedContent, $current) as $change) {
                    $who = $rows[$change['key']] ?? [];
                    $entry['fields'][] = [
                        'key' => $change['key'],
                        'label' => $change['label'],
                        'old' => $change['old'],
                        'new' => $change['new'],
                        'revertable' => $change['inOld'],
                        'authors' => array_values(array_unique(array_filter(array_column($who, 'login')))),
                        'changedAt' => $who === [] ? null : end($who)['createdAt'],
                    ];
                }
            }
            $entry['authors'] = array_values(array_unique(array_filter(array_merge(...array_map(static fn (array $list): array => array_column($list, 'login'), array_values($rows ?: [[]]))))));
            if ($entry['isNew'] || $entry['fields'] !== []) {
                $pages[] = $entry;
            } else {
                // Wszystko wróciło do wersji zatwierdzonej — nie ma czego akceptować.
                $this->settle($slug, null);
            }
        }

        $this->review->closeResolvedRequests(null);

        return [
            'pages' => $pages,
            'requests' => $this->review->requests('open'),
            'history' => $this->review->changes(null, $historyLimit),
        ];
    }

    /** Zatwierdza pole ($key), stronę ($key null) albo wszystko ($slug null). @return int zatwierdzone pola */
    public function approve(?string $slug, ?string $key, ?string $by): int
    {
        if ($slug === null) {
            $count = 0;
            foreach (array_keys($this->review->allApproved()) as $each) {
                $count += $this->approve($each, null, $by);
            }

            return $count;
        }

        $approved = $this->review->approved($slug);
        $page = $this->pages->findBySlug($slug);
        if (!$approved['exists'] || $page === null) {
            return 0;
        }

        if ($key === null || $approved['content'] === null) {
            // Cała strona (albo nowa strona): obecna treść = zatwierdzona.
            $count = $this->review->resolve($slug, null, 'approved', $by);
            $this->review->forgetApproved($slug);
            $this->review->closeResolvedRequests($by);

            return max(1, $count);
        }

        $path = $this->path($key);
        [$exists, $value] = ContentDiff::valueAt($page['content'], $path);
        if (!$exists) {
            throw new ApiException('Tego pola nie ma już na stronie.', 409);
        }
        $base = ContentDiff::withValue($approved['content'], $path, $value);
        if ($base === null) {
            // Pola nie było w wersji zatwierdzonej (np. dodane migracją) — zatwierdzamy całą stronę.
            return $this->approve($slug, null, $by);
        }
        $this->review->updateApproved($slug, $base);
        $this->review->resolve($slug, $key, 'approved', $by);
        $this->settle($slug, $by);

        return 1;
    }

    /** Cofa pole ($key) albo całą stronę ($key null) do wersji zatwierdzonej. Nowa strona = usunięcie. @return int cofnięte pola */
    public function revert(string $slug, ?string $key, ?string $by): int
    {
        $approved = $this->review->approved($slug);
        $page = $this->pages->findBySlug($slug);
        if (!$approved['exists'] || $page === null) {
            return 0;
        }

        if ($approved['content'] === null) {
            if ($key !== null) {
                throw new ApiException('Nowej strony nie cofa się polami — odrzuć całą stronę.', 409);
            }
            $this->pages->delete($slug);
            $this->afterDelete($slug, $by);

            return 1;
        }

        $current = $page['content'];
        $changes = ContentDiff::diff($approved['content'], $current);
        $count = 0;
        foreach ($changes as $change) {
            if ($key !== null && $change['key'] !== $key) {
                continue;
            }
            if (!$change['inOld']) {
                if ($key !== null) {
                    throw new ApiException('Tego pola nie było w wersji zatwierdzonej — można je tylko zatwierdzić.', 409);
                }
                continue;
            }
            $current = ContentDiff::withValue($current, $change['path'], $change['old']) ?? $current;
            $this->review->resolve($slug, $change['key'], 'reverted', $by);
            $count++;
        }
        if ($count > 0) {
            $this->pages->save($slug, $current);
        }
        $this->settle($slug, $by);

        return $count;
    }

    /** @return array{pending: int, request: ?array{id: int, message: string, createdAt: string}} */
    public function mine(?int $userId, string $login): array
    {
        return [
            'pending' => $userId === null ? 0 : $this->review->pendingCountFor($userId),
            'request' => $this->review->openRequestOf($login),
        ];
    }

    public function requestReview(?int $userId, string $login, string $message): int
    {
        return $this->review->request($userId, $login, mb_substr(trim($message), 0, 2000));
    }

    /**
     * Po każdej zmianie: oczekujące wpisy pól, które już nie różnią się od wersji zatwierdzonej
     * (np. edytor sam przywrócił wartość), są zamykane; brak różnic = wersja zatwierdzona znika.
     */
    private function settle(string $slug, ?string $by): void
    {
        $approved = $this->review->approved($slug);
        if (!$approved['exists'] || $approved['content'] === null) {
            return;
        }
        $page = $this->pages->findBySlug($slug);
        if ($page === null) {
            return;
        }
        $keys = array_column(ContentDiff::diff($approved['content'], $page['content']), 'key');
        if ($keys === []) {
            $this->review->resolve($slug, null, 'reverted', $by);
            $this->review->forgetApproved($slug);
        } else {
            $this->review->resolve($slug, null, 'reverted', $by, $keys);
        }
        $this->review->closeResolvedRequests($by);
    }

    /** @return list<string|int> */
    private function path(string $key): array
    {
        return ContentDiff::pathFromKey($key) ?? throw new ApiException('Nieprawidłowy klucz pola.', 400);
    }
}
