<?php

declare(strict_types=1);

namespace App\Api;

use RuntimeException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Błąd REST API v1 w formacie RFC 9457 (Problem Details, "application/problem+json").
 * "type" = adres opisu błędu w dokumentacji API, "title" = stały opis rodzaju błędu,
 * "detail" = opis tego konkretnego wystąpienia. Dodatkowe pola (np. "invalidParams") trafiają
 * do odpowiedzi jako rozszerzenia, nagłówki (np. "WWW-Authenticate", "Retry-After") — do nagłówków.
 */
final class Problem extends RuntimeException
{
    /**
     * @param array<string, mixed> $extensions
     * @param array<string, string> $headers
     */
    public function __construct(
        public readonly int $status,
        public readonly string $type,
        public readonly string $title,
        string $detail,
        public readonly array $extensions = [],
        public readonly array $headers = []
    ) {
        parent::__construct($detail);
    }

    /** @param list<array{name: string, reason: string}> $params */
    public static function invalidParameters(array $params): self
    {
        return new self(400, 'invalid-parameter', 'Invalid request parameter', 'One or more query parameters are invalid.', ['invalidParams' => $params]);
    }

    public static function unauthorized(string $detail): self
    {
        return new self(401, 'unauthorized', 'Authentication required', $detail, [], [
            'WWW-Authenticate' => 'Bearer realm="api", error="invalid_token"',
        ]);
    }

    public static function insufficientScope(string $scope): self
    {
        return new self(403, 'insufficient-scope', 'Insufficient scope', "This request requires the '{$scope}' scope.", ['requiredScope' => $scope], [
            'WWW-Authenticate' => 'Bearer realm="api", error="insufficient_scope", scope="' . $scope . '"',
        ]);
    }

    public static function insecureTransport(): self
    {
        return new self(403, 'insecure-transport', 'HTTPS required', 'The API is only available over HTTPS.');
    }

    public static function notFound(string $detail): self
    {
        return new self(404, 'not-found', 'Resource not found', $detail);
    }

    /** @param string[] $allowed */
    public static function methodNotAllowed(array $allowed): self
    {
        return new self(405, 'method-not-allowed', 'Method not allowed', 'Allowed methods: ' . implode(', ', $allowed) . '.', [], ['Allow' => implode(', ', $allowed)]);
    }

    public static function rateLimited(int $retryAfter, int $limit): self
    {
        return new self(429, 'rate-limited', 'Too many requests', "Rate limit of {$limit} requests per minute exceeded.", [], ['Retry-After' => (string) $retryAfter]);
    }

    public static function internal(): self
    {
        return new self(500, 'internal-error', 'Internal server error', 'An unexpected error occurred. Please retry later.');
    }
}
