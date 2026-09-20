<?php

declare(strict_types=1);

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Sanityzacja fragmentu HTML: parsujemy do drzewa DOM i budujemy wynik OD ZERA,
 * kopiując wyłącznie znane tagi i atrybuty. Tekst jest zawsze escapowany, więc nic
 * spoza list poniżej nie ma jak trafić na wyjście. Lista jest szeroka (układ, tekst,
 * listy, tabele, obrazki, "class" i "style"), bo artykuły są pisane jako gotowy HTML
 * ze stylami — blokujemy to, co wykonuje kod albo ładuje cudze zasoby. Nowy tag =
 * wpis w ALLOWED_TAGS, nowy atrybut = wpis w GLOBAL_ATTRIBUTES / TAG_ATTRIBUTES.
 */
final class HtmlSanitizer
{
    private const ALLOWED_TAGS = [
        // układ
        'div', 'section', 'header', 'footer', 'nav', 'aside', 'figure', 'figcaption',
        // tekst
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'blockquote', 'pre', 'code', 'br', 'hr',
        'strong', 'b', 'em', 'i', 'u', 's', 'small', 'mark', 'sub', 'sup',
        // linki i obrazki
        'a', 'img',
        // listy
        'ul', 'ol', 'li', 'dl', 'dt', 'dd',
        // tabele
        'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    ];

    /** Tagi bez zawartości i znacznika zamykającego. */
    private const VOID_TAGS = ['br', 'hr', 'img'];

    /** Atrybuty dozwolone na każdym dozwolonym tagu. */
    private const GLOBAL_ATTRIBUTES = ['class', 'style'];

    private const TAG_ATTRIBUTES = [
        'a' => ['href', 'title'],
        'img' => ['src', 'alt', 'width', 'height'],
        'th' => ['colspan', 'rowspan'],
        'td' => ['colspan', 'rowspan'],
    ];

    /**
     * Tagi usuwane RAZEM z zawartością: wykonują kod, osadzają cudze strony/obiekty albo (svg, math)
     * mają własne reguły parsowania, na których opierają się ataki typu mutation XSS.
     */
    private const DROP_WITH_CONTENT = ['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math'];

    private const SAFE_URL_SCHEMES = ['http', 'https', 'mailto'];

    /**
     * Konstrukcje CSS, przez które "style" mógłby wykonać kod albo ładować cudze zasoby (url(), image-set(),
     * expression(), @import, backslash i komentarze służące do obchodzenia filtrów). Deklaracja z takim
     * fragmentem jest usuwana w całości; reszta stylu zostaje.
     */
    private const UNSAFE_CSS = '~url\s*\(|image-set\s*\(|expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding|[@\\\\]|/\*~i';

    public static function sanitize(string $html): string
    {
        $previous = libxml_use_internal_errors(true);

        $document = new DOMDocument();
        $document->loadHTML('<?xml encoding="UTF-8"><body>' . $html . '</body>', LIBXML_NONET);

        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $body = $document->getElementsByTagName('body')->item(0);

        return $body === null ? '' : self::renderChildren($body);
    }

    private static function renderChildren(DOMNode $parent): string
    {
        $html = '';

        foreach ($parent->childNodes as $node) {
            if ($node instanceof DOMText) {
                $html .= htmlspecialchars($node->data, ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8');
            } elseif ($node instanceof DOMElement) {
                $html .= self::renderElement($node);
            }
            // Komentarze, instrukcje przetwarzania itp. są pomijane.
        }

        return $html;
    }

    private static function renderElement(DOMElement $element): string
    {
        $tag = strtolower($element->tagName);

        if (in_array($tag, self::DROP_WITH_CONTENT, true)) {
            return '';
        }

        // Obrazek bez bezpiecznego src nie ma sensu — usuwamy go w całości.
        if ($tag === 'img' && !self::isSafeUrl($element->getAttribute('src'))) {
            return '';
        }

        $inner = self::renderChildren($element);

        // Nieznany tag: rozpakowujemy (zostaje sam tekst).
        if (!in_array($tag, self::ALLOWED_TAGS, true)) {
            return $inner;
        }

        $attributes = [...self::GLOBAL_ATTRIBUTES, ...(self::TAG_ATTRIBUTES[$tag] ?? [])];
        $open = "<{$tag}" . self::renderAttributes($element, $attributes) . '>';

        return in_array($tag, self::VOID_TAGS, true) ? $open : "{$open}{$inner}</{$tag}>";
    }

    /** @param list<string> $allowed */
    private static function renderAttributes(DOMElement $element, array $allowed): string
    {
        $html = '';

        foreach ($allowed as $name) {
            if (!$element->hasAttribute($name)) {
                continue;
            }

            $value = $element->getAttribute($name);

            if ($name === 'href' && !self::isSafeUrl($value)) {
                continue;
            }

            if ($name === 'style') {
                $value = self::sanitizeStyle($value);
                if ($value === '') {
                    continue;
                }
            }

            $html .= sprintf(' %s="%s"', $name, htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
        }

        return $html;
    }

    /** Zostawia deklaracje CSS bez niebezpiecznych konstrukcji (patrz UNSAFE_CSS). */
    private static function sanitizeStyle(string $style): string
    {
        $safe = [];

        foreach (explode(';', $style) as $declaration) {
            $declaration = trim($declaration);

            if ($declaration !== '' && str_contains($declaration, ':') && preg_match(self::UNSAFE_CSS, $declaration) !== 1) {
                $safe[] = $declaration;
            }
        }

        return implode('; ', $safe);
    }

    /** Adresy względne są bezpieczne; z jawnym schematem tylko http/https/mailto (blokuje javascript:, data:, vbscript:). */
    private static function isSafeUrl(string $url): bool
    {
        // Przeglądarki ignorują białe/sterujące znaki wewnątrz schematu ("java\tscript:"), więc usuwamy je przed oceną.
        $url = preg_replace('/[\x00-\x20\x7F]+/', '', $url) ?? '';

        if ($url === '') {
            return false;
        }

        if (preg_match('~^([^/?#:]*):~', $url, $match) !== 1) {
            return true;
        }

        return in_array(strtolower($match[1]), self::SAFE_URL_SCHEMES, true);
    }
}
