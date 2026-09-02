<?php

declare(strict_types=1);

namespace App\Http;

use App\Config\Config;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Jeden punkt konfiguracji CORS — origin sterowany zmienną środowiskową, nie rozsiany po kontrolerach. */
final class Cors
{
    public static function handle(Config $config): void
    {
        $origin = $config->get('CORS_ALLOWED_ORIGIN', '*');

        header("Access-Control-Allow-Origin: {$origin}");
        header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');

        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
