<?php

declare(strict_types=1);

namespace App\Api;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Wysyłanie odpowiedzi REST API v1 — wspólne nagłówki, ETag / 304 (RFC 9110), HEAD bez treści
 * i błędy jako application/problem+json (RFC 9457).
 */
final class Response
{
    /** @var array<string, string> nagłówki dodawane do każdej odpowiedzi (X-Request-Id, RateLimit-*) */
    private static array $headers = [];

    public static function header(string $name, string $value): void
    {
        self::$headers[$name] = $value;
    }

    /**
     * Odpowiedź sukcesu. ETag liczony z treści; zgodny If-None-Match -> 304 bez treści.
     *
     * @param array<string, mixed> $payload
     */
    public static function json(array $payload, int $status = 200): never
    {
        $body = (string) json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
        $etag = 'W/"' . substr(hash('sha256', $body), 0, 32) . '"';

        self::emitHeaders([
            'Content-Type' => 'application/json; charset=utf-8',
            'ETag' => $etag,
            // Dane za tokenem: tylko klient może je trzymać i musi je odświeżać przez ETag.
            'Cache-Control' => 'private, no-cache',
            'Vary' => 'Authorization',
        ]);

        $ifNoneMatch = (string) ($_SERVER['HTTP_IF_NONE_MATCH'] ?? '');
        if ($status === 200 && $ifNoneMatch !== '' && in_array($etag, array_map('trim', explode(',', $ifNoneMatch)), true)) {
            http_response_code(304);
            exit;
        }

        http_response_code($status);
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
            echo $body;
        }
        exit;
    }

    public static function problem(Problem $problem, string $typeBase, string $instance): never
    {
        $payload = [
            'type' => rtrim($typeBase, '/') . '#' . $problem->type,
            'title' => $problem->title,
            'status' => $problem->status,
            'detail' => $problem->getMessage(),
            'instance' => $instance,
        ] + $problem->extensions;

        self::emitHeaders(['Content-Type' => 'application/problem+json; charset=utf-8', 'Cache-Control' => 'no-store'] + $problem->headers);
        http_response_code($problem->status);
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
            echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        }
        exit;
    }

    /** @param array<string, string> $headers */
    private static function emitHeaders(array $headers): void
    {
        foreach ($headers + self::$headers + ['X-Content-Type-Options' => 'nosniff'] as $name => $value) {
            header("{$name}: {$value}");
        }
    }
}
