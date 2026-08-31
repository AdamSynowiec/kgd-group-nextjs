<?php

declare(strict_types=1);

namespace App\Exception;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

final class NotFoundException extends ApiException
{
    public function __construct(string $message = 'Nie znaleziono zasobu.')
    {
        parent::__construct($message, 404);
    }
}
