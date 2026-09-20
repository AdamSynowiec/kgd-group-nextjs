<?php

declare(strict_types=1);

namespace App\Support;

use App\Exception\IngestException;
use DateTimeImmutable;
use Exception;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Walidacja payloadu POST /blog/articles. Zbiera WSZYSTKIE błędy naraz (partner
 * poprawia komplet, nie po jednym), a przy sukcesie zwraca znormalizowane wartości —
 * w tym content już po sanityzacji. Nowe pole = wpis w FIELDS + jedna linia w validate().
 */
final class ArticleValidator
{
    private const FIELDS = ['slug', 'meta_title', 'meta_desc', 'keyword', 'publish_date', 'content'];
    private const MAX_CONTENT_BYTES = 200000;

    /** Elementy struktury strony — content to sam fragment artykułu. Regex tylko WYKRYWA (odrzuca), nie czyści. */
    private const DOCUMENT_TAGS = '~<\s*/?\s*(!doctype|html|head|body|title|meta|link|base|main|article)\b~i';

    /** ISO 8601 z jawnym offsetem — data bez strefy jest niejednoznaczna, więc jej nie zgadujemy. */
    private const ISO_DATE = '~^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$~';

    /**
     * @param array<string, mixed> $body
     * @return array{slug: string, meta_title: string, meta_desc: string, keyword: ?string, publish_date: DateTimeImmutable, content: string}
     */
    public static function validate(array $body): array
    {
        $errors = [];

        foreach (array_diff(array_keys($body), self::FIELDS) as $unknown) {
            $errors[(string) $unknown] = 'Unknown field';
        }

        $article = [
            'slug' => self::slug($body, $errors),
            'meta_title' => self::text($body, 'meta_title', 3, 160, true, $errors),
            'meta_desc' => self::text($body, 'meta_desc', 20, 320, true, $errors),
            'keyword' => self::text($body, 'keyword', 1, 120, false, $errors),
            'publish_date' => self::publishDate($body, $errors),
            'content' => self::content($body, $errors),
        ];

        if ($errors !== []) {
            throw IngestException::validation($errors);
        }

        return $article;
    }

    /** @param array<string, string> $errors */
    private static function text(array $body, string $field, int $min, int $max, bool $required, array &$errors): ?string
    {
        $value = $body[$field] ?? null;

        if ($value === null) {
            if ($required) {
                $errors[$field] = 'Field is required';
            }
            return null;
        }

        if (!is_string($value)) {
            $errors[$field] = 'Must be a string';
            return null;
        }

        $value = trim($value);
        $length = mb_strlen($value);

        if ($length < $min || $length > $max) {
            $errors[$field] = "Length must be between {$min} and {$max} characters";
            return null;
        }

        if (preg_match('/[<>\r\n]/', $value) === 1) {
            $errors[$field] = 'Must be plain text (no "<", ">" or line breaks)';
            return null;
        }

        return $value;
    }

    /**
     * Akceptuje "/blog/x" i "blog/x"; zwraca postać kanoniczną "/blog/x".
     * @param array<string, string> $errors
     */
    private static function slug(array $body, array &$errors): ?string
    {
        $raw = self::text($body, 'slug', 1, 255, true, $errors);
        if ($raw === null) {
            return null;
        }

        $slug = Slug::fromSegments(explode('/', trim($raw, '/')));

        // "/blog/page" to zarezerwowany adres paginacji (patrz AdminController::createPage).
        if (preg_match('~^/blog/[^/]+$~', $slug) !== 1 || !Slug::isValid($slug) || $slug === '/blog/page') {
            $errors['slug'] = 'Must look like /blog/kebab-case-name (a-z, 0-9, hyphens); "/blog/page" is reserved';
            return null;
        }

        return $slug;
    }

    /** @param array<string, string> $errors */
    private static function publishDate(array $body, array &$errors): ?DateTimeImmutable
    {
        $raw = $body['publish_date'] ?? null;

        if ($raw === null) {
            $errors['publish_date'] = 'Field is required';
            return null;
        }

        if (!is_string($raw) || preg_match(self::ISO_DATE, $raw) !== 1) {
            $errors['publish_date'] = 'Expected ISO 8601 with UTC offset, e.g. 2026-09-20T10:00:00+02:00';
            return null;
        }

        try {
            $date = new DateTimeImmutable($raw);
        } catch (Exception) {
            $errors['publish_date'] = 'Not a valid date';
            return null;
        }

        // PHP "zawija" nieistniejące daty (2026-02-30 -> 2 marca) zamiast je odrzucić.
        $parseErrors = DateTimeImmutable::getLastErrors();
        if ($parseErrors !== false && $parseErrors['warning_count'] > 0) {
            $errors['publish_date'] = 'Not a valid date';
            return null;
        }

        return $date;
    }

    /** @param array<string, string> $errors */
    private static function content(array $body, array &$errors): ?string
    {
        $raw = $body['content'] ?? null;

        if ($raw === null) {
            $errors['content'] = 'Field is required';
            return null;
        }

        if (!is_string($raw)) {
            $errors['content'] = 'Must be a string';
            return null;
        }

        if (strlen($raw) > self::MAX_CONTENT_BYTES) {
            $errors['content'] = 'Must not exceed ' . self::MAX_CONTENT_BYTES . ' bytes';
            return null;
        }

        if (preg_match(self::DOCUMENT_TAGS, $raw) === 1) {
            $errors['content'] = 'Must be an HTML fragment, without html/head/body/title/meta/main/article elements';
            return null;
        }

        $sanitized = HtmlSanitizer::sanitize($raw);

        if (trim(strip_tags($sanitized)) === '') {
            $errors['content'] = 'Content is empty after sanitization';
            return null;
        }

        return $sanitized;
    }
}
