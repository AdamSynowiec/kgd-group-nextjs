<?php

declare(strict_types=1);

namespace App\Support;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Różnice między dwiema wersjami treści strony — pole po polu (węzły {value, editable},
 * patrz Editable.php) plus status strony (szkic / opublikowana). Struktura strony
 * (sekcje, komponenty, acl) nie jest porównywana — z panelu zmieniają się tylko wartości.
 *
 * Pole identyfikuje ścieżka do węzła, np. ["sections", 3, "fields", "header"]; jej zapis
 * JSON ("key") jest kluczem w historii zmian (page_changes.field_key).
 */
final class ContentDiff
{
    /**
     * @param array<string, mixed> $old
     * @param array<string, mixed> $new
     * @return list<array{key: string, path: list<string|int>, label: string, old: mixed, new: mixed, inOld: bool}>
     */
    public static function diff(array $old, array $new): array
    {
        $out = [];
        self::walk($new, [], $old, $new, $out);

        $oldStatus = (string) ($old['status'] ?? 'published');
        $newStatus = (string) ($new['status'] ?? 'published');
        if ($oldStatus !== $newStatus) {
            $out[] = ['key' => self::key(['status']), 'path' => ['status'], 'label' => 'Ogólne › Status strony', 'old' => $oldStatus, 'new' => $newStatus, 'inOld' => true];
        }

        return $out;
    }

    /** @param list<string|int> $path */
    public static function key(array $path): string
    {
        return (string) json_encode($path, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    /** @return list<string|int>|null */
    public static function pathFromKey(string $key): ?array
    {
        $path = json_decode($key, true);
        if (!is_array($path) || $path === [] || !array_is_list($path)) {
            return null;
        }
        foreach ($path as $part) {
            if (!is_string($part) && !is_int($part)) {
                return null;
            }
        }

        return $path;
    }

    /**
     * Wartość pola w treści: [czy istnieje, wartość]. Dla węzła {value, editable} — jego "value",
     * dla "status" — status strony.
     *
     * @param array<string, mixed> $content
     * @param list<string|int> $path
     * @return array{0: bool, 1: mixed}
     */
    public static function valueAt(array $content, array $path): array
    {
        if ($path === ['status']) {
            return [true, (string) ($content['status'] ?? 'published')];
        }
        [$found, $node] = self::get($content, $path);

        return $found && Editable::isEditableNode($node) ? [true, $node['value']] : [false, null];
    }

    /**
     * Ustawia wartość pola (węzeł musi istnieć). Zwraca zmienioną treść albo null, gdy pola nie ma.
     *
     * @param array<string, mixed> $content
     * @param list<string|int> $path
     * @return array<string, mixed>|null
     */
    public static function withValue(array $content, array $path, mixed $value): ?array
    {
        if ($path === ['status']) {
            $content['status'] = $value;

            return $content;
        }
        [$found, $node] = self::get($content, $path);
        if (!$found || !Editable::isEditableNode($node)) {
            return null;
        }
        $ref = &$content;
        foreach ($path as $part) {
            $ref = &$ref[$part];
        }
        $ref['value'] = $value;
        unset($ref);

        return $content;
    }

    public static function same(mixed $a, mixed $b): bool
    {
        $flags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION;

        return json_encode($a, $flags) === json_encode($b, $flags);
    }

    /**
     * Czytelna nazwa pola: "<sekcja> › <etykieta pola>", np. "Golf › Nagłówek".
     *
     * @param array<string, mixed> $content
     * @param list<string|int> $path
     */
    public static function label(array $content, array $path): string
    {
        if ($path === ['status']) {
            return 'Ogólne › Status strony';
        }
        $context = 'Ogólne';
        if (($path[0] ?? null) === 'sections' && is_int($path[1] ?? null)) {
            $section = $content['sections'][$path[1]] ?? [];
            $name = is_array($section) ? Editable::unwrap($section['label'] ?? null) : null;
            $context = is_string($name) && trim($name) !== '' ? trim($name) : (is_array($section) && is_string($section['component'] ?? null) ? $section['component'] : 'Sekcja ' . ($path[1] + 1));
        } elseif (($path[0] ?? null) === 'seo') {
            $context = 'SEO';
        }

        [, $node] = self::get($content, $path);
        $own = is_array($node) && is_string($node['label'] ?? null) && trim($node['label']) !== '' ? trim($node['label']) : null;
        if ($own === null) {
            $keys = array_values(array_filter($path, 'is_string'));
            $own = (string) (end($keys) ?: 'pole');
        }

        return mb_substr("{$context} › {$own}", 0, 250);
    }

    /**
     * @param list<string|int> $path
     * @param array<string, mixed> $oldRoot
     * @param array<string, mixed> $newRoot
     * @param list<array<string, mixed>> $out
     */
    private static function walk(mixed $node, array $path, array $oldRoot, array $newRoot, array &$out): void
    {
        if (Editable::isEditableNode($node)) {
            [$inOld, $oldValue] = self::valueAt($oldRoot, $path);
            if (!$inOld || !self::same($oldValue, $node['value'])) {
                $out[] = ['key' => self::key($path), 'path' => $path, 'label' => self::label($newRoot, $path), 'old' => $oldValue, 'new' => $node['value'], 'inOld' => $inOld];
            }

            return;
        }
        if (!is_array($node)) {
            return;
        }
        foreach ($node as $key => $child) {
            if ($path === [] && $key === 'acl') {
                continue;
            }
            self::walk($child, [...$path, $key], $oldRoot, $newRoot, $out);
        }
    }

    /**
     * @param array<string, mixed> $content
     * @param list<string|int> $path
     * @return array{0: bool, 1: mixed}
     */
    private static function get(array $content, array $path): array
    {
        $node = $content;
        foreach ($path as $part) {
            if (!is_array($node) || !array_key_exists($part, $node)) {
                return [false, null];
            }
            $node = $node[$part];
        }

        return [true, $node];
    }
}
