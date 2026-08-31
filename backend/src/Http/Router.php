<?php

declare(strict_types=1);

namespace App\Http;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Router dopasowujący po prefiksie ścieżki, nie po pełnych wyrażeniach
 * regularnych — każdy endpoint sam interpretuje resztę ścieżki przez
 * Request::segmentsAfter(). Przy kilkunastu trasach to wystarcza i jest
 * czytelniejsze niż silnik regexów; więcej reguł routingu -> warto podmienić.
 */
final class Router
{
    /** @var list<array{method: string, prefix: string, handler: callable}> */
    private array $routes = [];

    public function get(string $prefix, callable $handler): void
    {
        $this->routes[] = [
            'method' => 'GET',
            'prefix' => '/' . trim($prefix, '/'),
            'handler' => $handler,
        ];
    }

    public function dispatch(Request $request): void
    {
        $matchesPath = static fn (array $route): bool =>
            $request->path === $route['prefix'] || str_starts_with($request->path, $route['prefix'] . '/');

        $candidates = array_filter(
            $this->routes,
            static fn (array $route): bool => $route['method'] === $request->method && $matchesPath($route)
        );

        // Najdłuższy pasujący prefiks wygrywa, żeby np. "/api/pages" nie złapało "/api/page".
        usort($candidates, static fn (array $a, array $b): int => strlen($b['prefix']) <=> strlen($a['prefix']));

        if ($candidates !== []) {
            $handler = $candidates[0]['handler'];
            $handler($request);
            return;
        }

        $pathMatchesOtherMethod = array_filter($this->routes, $matchesPath);
        if ($pathMatchesOtherMethod !== []) {
            JsonResponse::error(405, 'Metoda niedozwolona dla tego adresu.');
        }

        JsonResponse::error(404, 'Nie znaleziono zasobu API pod tym adresem.');
    }
}
