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
 * listy, tabele, obrazki, podstawowe SVG, "class", "style" i blok <style>), bo artykuły
 * są pisane jako gotowy HTML ze stylami — blokujemy to, co wykonuje kod albo ładuje
 * cudze zasoby. Nowy tag = wpis w ALLOWED_TAGS / SVG_TAGS, nowy atrybut = wpis w
 * GLOBAL_ATTRIBUTES / TAG_ATTRIBUTES / SVG_ATTRIBUTES.
 */
final class HtmlSanitizer
{
    private const ALLOWED_TAGS = [
        // układ
        'div', 'section', 'article', 'header', 'footer', 'nav', 'aside', 'figure', 'figcaption',
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

    /**
     * Podstawowe kształty SVG (ikony, ilustracje). Bez elementów odwołujących się do innych zasobów lub
     * wykonujących kod: use, image, foreignObject, animate/set, a, script — te są rozpakowywane lub usuwane.
     * Bez defs/gradientów/clipPath, bo wymagają "id", którego nie przepuszczamy.
     */
    private const SVG_TAGS = ['svg', 'g', 'path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon', 'text', 'tspan'];

    /** Nazwy małymi literami — parser HTML zmniejsza litery atrybutów (viewBox → viewbox), przeglądarka to odwraca. */
    private const SVG_ATTRIBUTES = [
        'xmlns', 'viewbox', 'preserveaspectratio', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
        'd', 'points', 'transform',
        'fill', 'fill-rule', 'fill-opacity', 'clip-rule', 'opacity',
        'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-opacity',
        'role', 'aria-hidden', 'focusable',
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

    /** Tagi usuwane RAZEM z zawartością: wykonują kod, osadzają cudze strony/obiekty albo mają własne reguły parsowania (math). */
    private const DROP_WITH_CONTENT = ['script', 'iframe', 'object', 'embed', 'noscript', 'template', 'math'];

    private const SAFE_URL_SCHEMES = ['http', 'https', 'mailto'];

    /**
     * Konstrukcje CSS, przez które styl mógłby wykonać kod albo ładować cudze zasoby: url(), image-set(),
     * expression(), @import, javascript:, backslash (zapis obchodzący filtr, np. u\72l()). Dotyczy atrybutu
     * "style", bloku <style> i wartości atrybutów SVG.
     */
    private const UNSAFE_CSS = '~url\s*\(|image-set\s*\(|expression\s*\(|javascript:|vbscript:|behavior\s*:|-moz-binding|@import|\\\\~i';

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

        if ($tag === 'style') {
            return self::renderStyleBlock($element);
        }

        // Obrazek bez bezpiecznego src nie ma sensu — usuwamy go w całości.
        if ($tag === 'img' && !self::isSafeUrl($element->getAttribute('src'))) {
            return '';
        }

        $inner = self::renderChildren($element);

        if (in_array($tag, self::ALLOWED_TAGS, true)) {
            $allowed = [...self::GLOBAL_ATTRIBUTES, ...(self::TAG_ATTRIBUTES[$tag] ?? [])];
        } elseif (in_array($tag, self::SVG_TAGS, true)) {
            $allowed = [...self::GLOBAL_ATTRIBUTES, ...self::SVG_ATTRIBUTES];
        } else {
            // Nieznany tag: rozpakowujemy (zostaje sam tekst).
            return $inner;
        }

        $open = "<{$tag}" . self::renderAttributes($element, $allowed) . '>';

        return in_array($tag, self::VOID_TAGS, true) ? $open : "{$open}{$inner}</{$tag}>";
    }

    /**
     * Blok <style> przechodzi w całości albo wcale: odrzucamy go, gdy zawiera "<" (jedyny sposób, by
     * treść bloku mogła stać się znacznikiem — w SVG przeglądarka parsuje ją inaczej niż ten parser)
     * albo niebezpieczną konstrukcję (UNSAFE_CSS). Zawartość wypisujemy bez escapowania, bo
     * escapowanie zepsułoby selektory (">").
     */
    private static function renderStyleBlock(DOMElement $element): string
    {
        $css = $element->textContent;

        if (trim($css) === '' || str_contains($css, '<') || preg_match(self::UNSAFE_CSS, $css) === 1) {
            return '';
        }

        return "<style>{$css}</style>";
    }

    /** @param list<string> $allowed */
    private static function renderAttributes(DOMElement $element, array $allowed): string
    {
        $html = '';

        foreach ($element->attributes as $attribute) {
            $name = strtolower($attribute->nodeName);
            $value = $attribute->value;

            if (!in_array($name, $allowed, true)) {
                continue;
            }

            if ($name === 'href' && !self::isSafeUrl($value)) {
                continue;
            }

            if ($name === 'style') {
                $value = self::sanitizeStyle($value);

                if ($value === '') {
                    continue;
                }
            } elseif (in_array($name, self::SVG_ATTRIBUTES, true) && preg_match(self::UNSAFE_CSS, $value) === 1) {
                continue;
            }

            $html .= sprintf(' %s="%s"', $name, htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
        }

        return $html;
    }

    /** Zostawia deklaracje CSS bez niebezpiecznych konstrukcji (patrz UNSAFE_CSS) i bez komentarzy. */
    private static function sanitizeStyle(string $style): string
    {
        $safe = [];

        foreach (explode(';', $style) as $declaration) {
            $declaration = trim($declaration);

            if (
                $declaration !== ''
                && str_contains($declaration, ':')
                && !str_contains($declaration, '/*')
                && preg_match(self::UNSAFE_CSS, $declaration) !== 1
            ) {
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
