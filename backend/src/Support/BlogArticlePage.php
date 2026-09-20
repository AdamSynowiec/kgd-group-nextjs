<?php

declare(strict_types=1);

namespace App\Support;

use DateTimeImmutable;
use DateTimeZone;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Zamienia zwalidowany artykuł na dokument strony w `pages.content` — ten sam kształt,
 * który tworzy szablon "blog-post" z src/lib/pageTemplates.ts (artykuł z API jest
 * zwykłą stroną bloga, edytowalną w panelu). Zmiana szablonu we froncie = zmiana tutaj.
 */
final class BlogArticlePage
{
    /** @param array{slug: string, meta_title: string, meta_desc: string, keyword: ?string, cover_image: ?string, publish_date: DateTimeImmutable, content: string} $article */
    public static function build(array $article): array
    {
        $publishDate = $article['publish_date'];

        $seo = [
            'title' => self::field($article['meta_title'], 'Tytuł SEO', 'string'),
            'description' => self::field($article['meta_desc'], 'Opis SEO', 'string'),
        ];
        if ($article['keyword'] !== null) {
            $seo['keywords'] = [$article['keyword']];
        }

        return [
            'slug' => $article['slug'],
            'parent' => '/blog',
            'template' => 'blog-post',
            'title' => self::field($article['meta_title'], 'Tytuł', 'string'),
            // Data widoczna dla czytelnika (BlogPost.tsx) — dzień w czasie polskim, nie UTC.
            'updatedAt' => $publishDate->setTimezone(new DateTimeZone('Europe/Warsaw'))->format('Y-m-d'),
            // Przyszła data = szkic; przełączenie na "published" to osobna operacja (nie ten endpoint).
            'status' => $publishDate <= new DateTimeImmutable() ? 'published' : 'draft',
            'seo' => $seo,
            // Bez tego strona bez "acl" byłaby widoczna w panelu tylko dla admina (patrz Acl::check).
            'acl' => ['role' => 'blog', 'permission' => 'read/write'],
            'sections' => [[
                'id' => 'post',
                'component' => 'BlogPost',
                'fields' => [
                    'excerpt' => self::field('', 'Zajawka (widoczna na liście)', 'string'),
                    'coverImage' => self::field($article['cover_image'] ?? '', 'Zdjęcie główne', 'asset'),
                    'author' => self::field('', 'Autor', 'string'),
                    'body' => self::field($article['content'], 'Treść artykułu', 'richtext'),
                    'tags' => self::field([], 'Tagi', 'table'),
                ],
            ]],
        ];
    }

    private static function field(mixed $value, string $label, string $type): array
    {
        return ['value' => $value, 'editable' => true, 'label' => $label, 'type' => $type];
    }
}
