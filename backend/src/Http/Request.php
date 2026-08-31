<?php

declare(strict_types=1);

namespace App\Http;

/** Cienka otoczka na dane żądania — kontrolery i router nie dotykają superglobalnych zmiennych bezpośrednio. */
final class Request
{
    private function __construct(
        public readonly string $method,
        public readonly string $path,
        /** @var array<string, string> */
        public readonly array $query,
    ) {
    }

    public static function fromGlobals(): self
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $uri = $_SERVER['REQUEST_URI'] ?? '/';
        $path = (string) parse_url($uri, PHP_URL_PATH);

        $normalized = rtrim($path, '/');

        return new self($method, $normalized === '' ? '/' : $normalized, $_GET);
    }

    /** Segmenty ścieżki żądania po odcięciu podanego prefiksu, np. "/api/page". */
    public function segmentsAfter(string $prefix): array
    {
        $prefix = '/' . trim($prefix, '/');
        $remainder = str_starts_with($this->path, $prefix)
            ? substr($this->path, strlen($prefix))
            : $this->path;

        return array_values(array_filter(
            explode('/', $remainder),
            static fn (string $segment): bool => $segment !== ''
        ));
    }
}
