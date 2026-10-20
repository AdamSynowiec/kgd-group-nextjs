<?php

declare(strict_types=1);

define('APP_ENTRY', true);

use App\Database\Connection;
use App\Http\JsonResponse;
use App\PriceReport\PriceReportGenerator;
use App\Repository\MysqlActivityLogRepository;
use App\Repository\MysqlPageRepository;
use App\Support\FileLog;

/**
 * Zadania cykliczne serwera (cron hostingu). Dziś jedno: raporty cen ofertowych
 * dla dane.gov.pl (PriceReportGenerator) — codziennie, dla każdej inwestycji.
 *
 * Wywołanie z crona hostingu (jedna z dwóch form):
 *   php /ścieżka/do/api/cron.php price-reports
 *   wget -qO- "https://kgd-group.pl/api/cron.php?task=price-reports&token=SEKRET"
 *
 * Przez HTTP wymagany token: w .env tylko jego hash sha256 —
 *   CRON_TOKEN_SHA256=<sha256 tokenu>
 * Brak hasha w .env = HTTP zawsze 403 (fail closed). Z linii poleceń (PHP_SAPI cli)
 * token nie jest potrzebny — tam dostęp ma tylko właściciel konta hostingu.
 */
$config = require __DIR__ . '/src/bootstrap.php';

$cli = PHP_SAPI === 'cli';
$task = $cli ? ($argv[1] ?? '') : (string) ($_GET['task'] ?? '');

if (!$cli) {
    $expected = strtolower(trim($config->get('CRON_TOKEN_SHA256')));
    $presented = (string) ($_GET['token'] ?? '');
    $header = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? '');
    if ($presented === '' && str_starts_with($header, 'Bearer ')) {
        $presented = substr($header, 7);
    }
    if ($expected === '' || $presented === '' || !hash_equals($expected, hash('sha256', $presented))) {
        JsonResponse::error(403, 'Brak dostępu.');
    }
}

if ($task !== 'price-reports') {
    if ($cli) {
        fwrite(STDERR, "Użycie: php cron.php price-reports\n");
        exit(1);
    }
    JsonResponse::error(400, 'Nieznane zadanie. Dostępne: price-reports.');
}

$pdo = Connection::get($config);
$generator = new PriceReportGenerator(new MysqlPageRepository($pdo), $config->get('SITE_URL', 'https://kgd-group.pl'));

try {
    $results = $generator->generate();
} catch (Throwable $exception) {
    FileLog::write('price-reports', 'cron: ' . $exception->getMessage());
    if ($cli) {
        fwrite(STDERR, $exception->getMessage() . "\n");
        exit(1);
    }
    JsonResponse::error(500, $exception->getMessage());
}

$summary = array_map(static fn (array $result): string => "{$result['key']}: {$result['result']}", $results);
FileLog::write('price-reports', 'cron: ' . implode(', ', $summary));
(new MysqlActivityLogRepository($pdo))->log(null, $cli ? 'cron:cli' : 'cron:http', 'price-reports.generate', 'wszystkie', ['results' => $summary]);

if ($cli) {
    foreach ($results as $result) {
        $warnings = count($result['warnings'] ?? []);
        echo str_pad($result['key'], 28) . str_pad($result['result'], 9) . $result['message'] . ($warnings > 0 ? " ({$warnings} ostrzeżeń)" : '') . "\n";
    }
    exit(in_array('error', array_column($results, 'result'), true) ? 2 : 0);
}

JsonResponse::ok($results);
