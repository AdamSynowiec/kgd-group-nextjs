<?php

declare(strict_types=1);

use App\Config\Config;
use App\Exception\ApiException;
use App\Http\JsonResponse;

/**
 * Punkt startowy backendu: autoloader (bez Composera — kod musi dać się
 * wgrać samym FTP na hosting bez dostępu do shella), konfiguracja i
 * globalna obsługa błędów. Wywoływane raz, na początku public/index.php.
 */

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $file = __DIR__ . '/' . str_replace('\\', '/', $relative) . '.php';

    if (is_file($file)) {
        require $file;
    }
});

$config = new Config(__DIR__ . '/../.env');

error_reporting($config->isDebug() ? E_ALL : 0);
ini_set('display_errors', $config->isDebug() ? '1' : '0');

set_exception_handler(static function (Throwable $exception) use ($config): void {
    $status = $exception instanceof ApiException ? $exception->status() : 500;

    $message = $exception instanceof ApiException || $config->isDebug()
        ? $exception->getMessage()
        : 'Wewnętrzny błąd serwera.';

    JsonResponse::error($status, $message);
});

return $config;
