<?php

declare(strict_types=1);

namespace App\Api\V1;

use App\Api\Problem;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Publiczna dokumentacja API (bez tokenu — nie zawiera danych):
 *   GET /v1/docs          docs/rest-api-v1.md jako strona HTML (na nią wskazuje "type" błędów: /docs#not-found),
 *   GET /v1/openapi.yaml  specyfikacja OpenAPI 3.1 do Swagger UI / Postmana / generatorów klientów.
 * Pliki: backend/docs (deploy kopiuje je do api/docs).
 */
final class Docs
{
    public function __construct(private readonly string $dir)
    {
    }

    public function page(): never
    {
        // Link do specyfikacji w Markdownie jest względny do pliku w repo — na stronie wskazuje endpoint.
        $markdown = str_replace('](api-v1.openapi.yaml)', '](' . Links::to('/openapi.yaml') . ')', $this->read('rest-api-v1.md'));
        $source = json_encode($markdown, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE);

        $html = <<<HTML
            <!doctype html>
            <html lang="pl">
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>KGD Group — REST API v1</title>
            <style>
              :root { color-scheme: light dark; --fg: #18181b; --muted: #52525b; --bg: #fff; --code: #f4f4f5; --line: #e4e4e7; --accent: #4f46e5; }
              @media (prefers-color-scheme: dark) { :root { --fg: #f4f4f5; --muted: #a1a1aa; --bg: #09090b; --code: #18181b; --line: #27272a; --accent: #818cf8; } }
              body { margin: 0; background: var(--bg); color: var(--fg); font: 15px/1.65 system-ui, -apple-system, "Segoe UI", sans-serif; }
              main { max-width: 860px; margin: 0 auto; padding: 32px 16px 80px; }
              h1 { font-size: 28px; margin-top: 0; } h2 { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--line); } h3 { margin-top: 28px; }
              a { color: var(--accent); } p, li { color: var(--fg); }
              code { font: 13px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace; background: var(--code); padding: 1px 5px; border-radius: 4px; }
              pre { background: var(--code); padding: 14px 16px; border-radius: 8px; overflow-x: auto; } pre code { padding: 0; background: none; }
              table { border-collapse: collapse; width: 100%; display: block; overflow-x: auto; font-size: 14px; }
              th, td { border: 1px solid var(--line); padding: 6px 10px; text-align: left; vertical-align: top; } th { background: var(--code); }
              :target { scroll-margin-top: 16px; } td:has(:target) { background: color-mix(in srgb, var(--accent) 15%, transparent); }
            </style>
            </head>
            <body>
            <main id="docs">Wczytywanie dokumentacji…</main>
            <script src="https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js"></script>
            <script>
              const root = document.getElementById("docs");
              root.innerHTML = marked.parse({$source});
              // Kotwice nagłówków jak na GitHubie (spis treści w Markdownie z nich korzysta).
              root.querySelectorAll("h2, h3").forEach((h) => {
                h.id = h.textContent.trim().toLowerCase().replace(/[^\\p{L}\\p{N}\\s-]/gu, "").replace(/\\s/g, "-");
              });
              if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
            </script>
            </body>
            </html>
            HTML;

        $this->send('text/html; charset=utf-8', $html);
    }

    public function openapi(): never
    {
        $this->send('application/yaml; charset=utf-8', $this->read('api-v1.openapi.yaml'));
    }

    private function read(string $file): string
    {
        $content = @file_get_contents($this->dir . '/' . $file);
        if ($content === false) {
            throw Problem::notFound('Documentation is not available on this server.');
        }

        return $content;
    }

    private function send(string $contentType, string $body): never
    {
        header("Content-Type: {$contentType}");
        header('Cache-Control: public, max-age=300');
        header('X-Content-Type-Options: nosniff');
        http_response_code(200);
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') {
            echo $body;
        }
        exit;
    }
}
