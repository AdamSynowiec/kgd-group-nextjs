<?php

declare(strict_types=1);

namespace App\Repository;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Granica między warstwą HTTP a źródłem danych. Dzięki interfejsowi kontroler
 * nie wie, że dane pochodzą z MySQL — podmiana na inny magazyn (np. cache,
 * inna baza, testowy fake) nie dotyka reszty aplikacji.
 */
interface PageRepositoryInterface
{
    /** @return array{slug: string, content: array<string, mixed>, updatedAt: string}|null */
    public function findBySlug(string $slug): ?array;

    /** @return list<array{slug: string, title: string, updatedAt: string}> */
    public function listPublished(): array;

    /**
     * Jak listPublished(), ale pokazuje też szkice — pod panel edycji.
     * @return list<array{slug: string, title: string, status: string, updatedAt: string}>
     */
    public function listAll(): array;

    /**
     * Nadpisuje "content" strony o podanym slugu. Nie tworzy nowego wiersza —
     * rzuca, jeśli taki slug jeszcze nie istnieje (patrz db/schema.sql, jak
     * dodać nową stronę).
     */
    public function save(string $slug, array $content): void;
}
