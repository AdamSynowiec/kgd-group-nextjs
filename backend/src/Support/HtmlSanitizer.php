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
 * Sanityzacja fragmentu HTML metodą allowlisty: parsujemy do drzewa DOM i
 * budujemy wynik OD ZERA, kopiując wyłącznie dozwolone tagi/atrybuty. Tekst jest
 * zawsze escapowany, więc nic spoza allowlisty nie ma jak trafić na wyjście —
 * bez regexów po HTML-u. Nowy tag/atrybut = jeden wpis w ALLOWED_TAGS.
 */
final class HtmlSanitizer
{
    /** tag => dozwolone atrybuty. Wszystko spoza tej listy jest rozpakowywane (zostaje sam tekst). */
    private const ALLOWED_TAGS = [
        'p' => [], 'h2' => [], 'h3' => [], 'h4' => [],
        'ul' => [], 'ol' => [], 'li' => [],
        'strong' => [], 'em' => [], 'br' => [], 'blockquote' => [],
        'a' => ['href', 'title'],
        'table' => [], 'thead' => [], 'tbody' => [], 'tr' => [], 'th' => [], 'td' => [],
    ];

    /** Tagi usuwane RAZEM z zawartością — ich tekst (kod, CSS) nie ma sensu jako treść artykułu. */
    private const DROP_WITH_CONTENT = ['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template'];

    private const SAFE_URL_SCHEMES = ['http', 'https', 'mailto'];

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

        $inner = self::renderChildren($element);

        if (!isset(self::ALLOWED_TAGS[$tag])) {
            return $inner;
        }

        if ($tag === 'br') {
            return '<br>';
        }

        return "<{$tag}" . self::renderAttributes($element, self::ALLOWED_TAGS[$tag]) . ">{$inner}</{$tag}>";
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

            $html .= sprintf(' %s="%s"', $name, htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'));
        }

        return $html;
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
