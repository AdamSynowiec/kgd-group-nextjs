<?php

declare(strict_types=1);

namespace App\Exception;

use RuntimeException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Bazowy wyjątek API — niesie status HTTP, który front controller odczyta przy renderowaniu błędu. */
class ApiException extends RuntimeException
{
    public function __construct(string $message, private readonly int $status = 500)
    {
        parent::__construct($message);
    }

    public function status(): int
    {
        return $this->status;
    }
}
