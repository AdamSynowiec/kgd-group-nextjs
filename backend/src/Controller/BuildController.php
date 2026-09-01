<?php

declare(strict_types=1);

namespace App\Controller;

use App\Http\GithubDispatcher;
use App\Http\JsonResponse;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Przycisk "Zbuduj stronę" w panelu — odpala GitHub Actions bez pushowania commita. */
final class BuildController
{
    public function __construct(private readonly GithubDispatcher $dispatcher)
    {
    }

    /** POST /build */
    public function trigger(): void
    {
        $this->dispatcher->dispatch();

        JsonResponse::ok(['triggered' => true]);
    }
}
