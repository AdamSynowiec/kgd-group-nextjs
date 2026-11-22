<?php

declare(strict_types=1);

namespace App\Controller;

use App\Http\JsonResponse;
use App\Http\Request;
use App\PriceReport\PriceReportGenerator;
use RuntimeException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Publiczny odczyt aktualnego raportu cen jednej inwestycji (index.php):
 *   GET ?route=/price-register/<klucz>   np. /price-register/rudava-park
 *   -> {"data": {"key", "name", "developer", "rows", "csv"}}
 *
 * "csv" to dokładnie ten plik, który generator CMS zapisałby dziś (48 pól, BOM, ";", CRLF).
 * Korzystają z tego zewnętrzne generatory na stronach inwestycji (ext_price_raport_generator),
 * które publikują własny dataset.xml/dataset.md5 pod adresem zgłoszonym do dane.gov.pl.
 * Nic nie zapisuje; dane są jawne (te same co na stronie /inwestycja/<x>/historia-cen).
 */
final class PriceRegisterController
{
    private const PREFIX = '/price-register';

    public function __construct(private readonly PriceReportGenerator $generator)
    {
    }

    public function show(Request $request): void
    {
        $segments = $request->segmentsAfter(self::PREFIX);
        if (count($segments) !== 1) {
            JsonResponse::error(404, 'Podaj klucz inwestycji: ?route=/price-register/<klucz>.');
        }

        try {
            $report = $this->generator->currentReport($segments[0]);
        } catch (RuntimeException $exception) {
            JsonResponse::error(422, $exception->getMessage());
        }

        header('Cache-Control: no-store');
        JsonResponse::ok($report);
    }
}
