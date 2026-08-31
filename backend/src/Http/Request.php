<?php

declare(strict_types=1);

namespace App\Http;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Cienka otoczka na dane żądania — kontrolery i router nie dotykają
 * superglobalnych zmiennych bezpośrednio.
 *
 * Trasa NIE jest czytana z ładnego URL-a (REQUEST_URI), tylko z parametru
 * ?route=. Powód: sam URL zależy od przepisywania adresów przez serwer
 * (mod_rewrite w .htaccess) — na części hostingów współdzielonych (np. gdy
 * serwer stoi na nginx, nie Apache) .htaccess jest po prostu ignorowany.
 * Query string działa zawsze, bez żadnej konfiguracji serwera.
 */
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
        $route = $_GET['route'] ?? '/';

        $normalized = rtrim((string) $route, '/');

        return new self($method, $normalized === '' ? '/' : $normalized, $_GET);
    }

    /** Segmenty ścieżki żądania po odcięciu podanego prefiksu, np. "/page". */
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
