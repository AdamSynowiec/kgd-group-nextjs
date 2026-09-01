<?php

declare(strict_types=1);

namespace App\Database;

use App\Config\Config;
use PDO;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Jedno połączenie PDO na cały request, tworzone leniwie przy pierwszym użyciu. */
final class Connection
{
    private static ?PDO $instance = null;

    public static function get(Config $config): PDO
    {
        if (self::$instance !== null) {
            return self::$instance;
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $config->get('DB_HOST', '127.0.0.1'),
            (int) $config->get('DB_PORT', '3306'),
            $config->get('DB_NAME')
        );

        self::$instance = new PDO($dsn, $config->get('DB_USER'), $config->get('DB_PASS'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            // rowCount() po UPDATE ma liczyć wiersze DOPASOWANE przez WHERE, nie tylko
            // faktycznie zmienione — inaczej zapis identycznej treści (0 zmian) wyglądałby
            // tak samo jak "nie znaleziono strony o takim slugu" (patrz AdminController::savePage).
            PDO::MYSQL_ATTR_FOUND_ROWS => true,
        ]);

        return self::$instance;
    }
}
