<?php

declare(strict_types=1);

namespace App\Repository;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Granica między warstwą HTTP a magazynem "kolekcji" (patrz db/007_create_collection_items_table.sql)
 * — mirror PageRepositoryInterface, ale każda metoda jest zakresowana przez
 * $collection (jedna tabela obsługuje dowolną liczbę kolekcji), i — w
 * odróżnieniu od stron — kolekcje mają prawdziwe tworzenie/usuwanie oraz
 * stronicowane listowanie po indeksowanych kolumnach status/published_at.
 */
interface CollectionItemRepositoryInterface
{
    /** @return array{slug: string, content: array<string, mixed>, status: string, publishedAt: ?string, updatedAt: string}|null */
    public function findBySlug(string $collection, string $slug): ?array;

    /**
     * Wszystkie elementy kolekcji (też szkice) — pod listę w panelu.
     * @return list<array{slug: string, title: string, status: string, publishedAt: ?string, updatedAt: string}>
     */
    public function listAll(string $collection): array;

    /**
     * Opublikowane elementy, najnowsze pierwsze, stronicowane — pod publiczną
     * listę i generateStaticParams() paginacji. Zwraca PEŁNĄ treść (nie samo
     * podsumowanie) — to wywołujący (szablon publiczny) decyduje, które pola
     * pokazać na karcie, repozytorium nie zna kształtu treści konkretnej
     * kolekcji.
     * @return list<array{slug: string, content: array<string, mixed>, publishedAt: ?string}>
     */
    public function listPublished(string $collection, int $limit, int $offset): array;

    public function countPublished(string $collection): int;

    /**
     * Tworzy nowy element ze statusem "draft" i pustą datą publikacji.
     * Rzuca (PDOException kod 23000), jeśli (collection, slug) już istnieje
     * — kontroler zamienia to na czytelną odpowiedź 409.
     * @param array<string, mixed> $content
     * @return array{slug: string, content: array<string, mixed>, status: string, publishedAt: ?string, updatedAt: string}
     */
    public function create(string $collection, string $slug, array $content): array;

    /**
     * Nadpisuje treść/status/datę publikacji istniejącego elementu. Rzuca,
     * jeśli (collection, slug) nie istnieje.
     * @param array<string, mixed> $content
     */
    public function save(string $collection, string $slug, array $content, string $status, ?string $publishedAt): void;

    public function delete(string $collection, string $slug): void;
}
