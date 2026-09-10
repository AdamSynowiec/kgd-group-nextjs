<?php

declare(strict_types=1);

/**
 * Migracja jednorazowa: blog z `collection_items` (collection='blog') do
 * `pages` — patrz plan refaktoru. Ta sama konwencja co
 * backend/scripts/backfill-field-types.php: DRY RUN domyślnie, `--apply`
 * żeby faktycznie zapisać, wymaga backend/.env.
 *
 * Uruchomienie:
 *   php backend/scripts/migrate-blog-to-pages.php              # podgląd
 *   php backend/scripts/migrate-blog-to-pages.php --apply       # zapis
 *
 * Co robi:
 *   1. Wstawia wiersz "/blog" (strona-lista) do `pages`, jeśli jeszcze nie
 *      istnieje — z sekcją BlogHero (patrz src/components/blog/BlogHero.tsx).
 *   2. Dla każdego wiersza collection_items WHERE collection='blog' buduje
 *      odpowiadającą "Page" (parent:"/blog", template:"blog-post", sekcja
 *      BlogPost z tymi samymi polami excerpt/coverImage/author/tags/body —
 *      węzły {value,editable,label,type} przechodzą BEZ ZMIAN, tylko owinięte
 *      w kształt strony) i robi INSERT do `pages` (UPDATE, jeśli slug już tam
 *      jest — idempotentne, bezpieczne do wielokrotnego uruchomienia).
 *      `created_at` nowego wiersza ustawiany jawnie na published_at (albo
 *      created_at) starego wiersza, żeby zachować kolejność "najnowsze
 *      pierwsze" (patrz MysqlPageRepository::listPublished/listAll — sortuje
 *      dzieci strony po created_at, bo `pages` nie ma osobnej kolumny
 *      published_at).
 *   3. NIE kasuje `collection_items` — to osobna, ręczna migracja
 *      (db/008_drop_collection_items.sql), uruchamiana dopiero po
 *      potwierdzeniu, że dane widoczne są poprawnie w panelu/na stronie.
 */

define('APP_ENTRY', true);

require __DIR__ . '/../src/Config/Config.php';
require __DIR__ . '/../src/Database/Connection.php';

use App\Config\Config;
use App\Database\Connection;

$apply = in_array('--apply', $argv, true);

echo ($apply ? "TRYB: ZAPIS\n" : "TRYB: PODGLĄD (dry run) — użyj --apply, żeby faktycznie zapisać\n");
echo str_repeat('-', 70) . "\n";

$config = new Config(__DIR__ . '/../.env');
$pdo = Connection::get($config);

// --- 1. Strona /blog (lista) -------------------------------------------------

$blogIndexCheck = $pdo->prepare('SELECT 1 FROM pages WHERE slug = :slug');
$blogIndexCheck->execute(['slug' => '/blog']);
$blogIndexExists = $blogIndexCheck->fetchColumn() !== false;

if ($blogIndexExists) {
    echo "/blog                                                   już istnieje w `pages` — pomijam.\n";
} else {
    $blogIndexContent = [
        'slug' => '/blog',
        'parent' => '/',
        'template' => 'blog-index',
        'title' => ['value' => 'Blog', 'editable' => true, 'label' => 'Tytuł', 'type' => 'string'],
        'updatedAt' => (new DateTimeImmutable())->format('Y-m-d'),
        'status' => 'published',
        'nav' => ['label' => 'Blog', 'order' => 99],
        'seo' => [
            'title' => ['value' => 'Blog — KGD Group', 'editable' => true, 'label' => 'Tytuł SEO', 'type' => 'string'],
            'description' => [
                'value' => 'Nowości, porady i historie ze świata inwestycji KGD Group.',
                'editable' => true,
                'label' => 'Opis SEO',
                'type' => 'string',
            ],
        ],
        'sections' => [
            [
                'id' => 'hero',
                'component' => 'BlogHero',
                'fields' => [
                    'eyebrow' => ['value' => 'Aktualności', 'editable' => true, 'label' => 'Nadpis', 'type' => 'string'],
                    'heading' => ['value' => 'Blog KGD Group', 'editable' => true, 'label' => 'Nagłówek', 'type' => 'string'],
                    'intro' => [
                        'value' => 'Nowości, porady i historie ze świata inwestycji KGD Group.',
                        'editable' => true,
                        'label' => 'Wstęp',
                        'type' => 'string',
                    ],
                ],
            ],
        ],
    ];

    echo "/blog                                                   nowa strona-lista (BlogHero)\n";

    if ($apply) {
        $insert = $pdo->prepare('INSERT INTO pages (slug, content) VALUES (:slug, :content)');
        $insert->execute([
            'slug' => '/blog',
            'content' => json_encode($blogIndexContent, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
        ]);
    }
}

// --- 2. Wpisy bloga (collection_items -> pages) -------------------------------

$hasCollectionItems = $pdo->query("SHOW TABLES LIKE 'collection_items'")->fetchColumn() !== false;

if (!$hasCollectionItems) {
    echo "\nTabela `collection_items` nie istnieje (już usunięta?) — nic do migracji.\n";
    exit(0);
}

$rows = $pdo->prepare('SELECT slug, content, status, published_at, created_at FROM collection_items WHERE collection = :collection ORDER BY id');
$rows->execute(['collection' => 'blog']);
$rows = $rows->fetchAll();

$insertPage = $pdo->prepare(
    'INSERT INTO pages (slug, content, created_at) VALUES (:slug, :content, :created_at) '
    . 'ON DUPLICATE KEY UPDATE content = :content2, created_at = :created_at2'
);

foreach ($rows as $row) {
    $itemContent = json_decode($row['content'], true, 512, JSON_THROW_ON_ERROR);
    $pageSlug = '/blog/' . $row['slug'];

    $title = $itemContent['title'] ?? ['value' => $row['slug'], 'editable' => true, 'label' => 'Tytuł', 'type' => 'string'];
    $seo = $itemContent['seo'] ?? null;

    // Zachowaj kolejność "najnowsze pierwsze": published_at, jak go brak -
    // created_at ze starego wiersza, zamiast NOW() (co spłaszczyłoby kolejność
    // wszystkich migrowanych wpisów do jednej chwili migracji). Ten sam
    // moment idzie też do "updatedAt" w treści (BlogPost.tsx wyświetla go
    // czytelnikowi jako datę artykułu) — inaczej migracja pokazałaby
    // wszystkim wpisom dzisiejszą datę zamiast oryginalnej daty publikacji.
    $createdAt = $row['published_at'] ?? $row['created_at'];
    $displayDate = (new DateTimeImmutable($createdAt))->format('Y-m-d');

    $pageContent = [
        'slug' => $pageSlug,
        'parent' => '/blog',
        'template' => 'blog-post',
        'title' => $title,
        'updatedAt' => $displayDate,
        'status' => $row['status'] === 'published' ? 'published' : 'draft',
        'seo' => $seo,
        'sections' => [
            [
                'id' => 'post',
                'component' => 'BlogPost',
                'fields' => [
                    'excerpt' => $itemContent['excerpt'] ?? null,
                    'coverImage' => $itemContent['coverImage'] ?? null,
                    'author' => $itemContent['author'] ?? null,
                    'tags' => $itemContent['tags'] ?? null,
                    'body' => $itemContent['body'] ?? null,
                ],
            ],
        ],
    ];

    printf("%-55s  -> %s (status: %s, created_at: %s)\n", '/blog/' . $row['slug'], $pageSlug, $pageContent['status'], $createdAt);

    if ($apply) {
        $json = json_encode($pageContent, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $insertPage->execute([
            'slug' => $pageSlug,
            'content' => $json,
            'created_at' => $createdAt,
            'content2' => $json,
            'created_at2' => $createdAt,
        ]);
    }
}

echo str_repeat('-', 70) . "\n";
printf("Razem: %d wpisów w collection_items (collection='blog')\n", count($rows));

if (!$apply) {
    echo "\nNic nie zapisano (dry run). Uruchom z --apply, żeby faktycznie zapisać.\n";
} else {
    echo "\nZapisano do `pages` (INSERT nowych / UPDATE już istniejących pod tym samym slugiem).\n";
    echo "`collection_items` NIE zostało usunięte — po weryfikacji uruchom ręcznie db/008_drop_collection_items.sql.\n";
}
