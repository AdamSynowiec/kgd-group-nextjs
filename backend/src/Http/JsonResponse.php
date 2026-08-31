<?php

declare(strict_types=1);

namespace App\Http;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Jeden, spójny kształt odpowiedzi dla całego API: {"data": ...} albo {"error": ...}. */
final class JsonResponse
{
    /** @param array<string, mixed> $payload */
    public static function send(array $payload, int $status = 200): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    /** @param array<string, mixed> $meta */
    public static function ok(mixed $data, array $meta = []): never
    {
        self::send(['data' => $data, 'meta' => $meta], 200);
    }

    public static function error(int $status, string $message): never
    {
        self::send(['error' => ['status' => $status, 'message' => $message]], $status);
    }
}
