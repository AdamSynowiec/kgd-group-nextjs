<?php

declare(strict_types=1);

namespace App\Config;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Czyta konfigurację z pliku .env obok tego katalogu oraz ze zmiennych
 * środowiskowych serwera — te drugie mają pierwszeństwo, żeby dało się
 * nadpisać ustawienia w panelu hostingu bez dotykania plików.
 */
final class Config
{
    /** @var array<string, string> */
    private readonly array $values;

    public function __construct(string $envFile)
    {
        $this->values = self::parseEnvFile($envFile);
    }

    public function get(string $key, string $default = ''): string
    {
        $fromEnv = getenv($key);
        if ($fromEnv !== false) {
            return $fromEnv;
        }

        return $this->values[$key] ?? $default;
    }

    public function isDebug(): bool
    {
        return $this->get('APP_DEBUG', 'false') === 'true';
    }

    /** @return array<string, string> */
    private static function parseEnvFile(string $path): array
    {
        if (!is_file($path)) {
            return [];
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        $values = [];

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }

            [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
            $values[trim($key)] = trim($value, " \t\n\r\0\x0B\"'");
        }

        return $values;
    }
}
