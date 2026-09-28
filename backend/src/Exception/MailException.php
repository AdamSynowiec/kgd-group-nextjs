<?php

declare(strict_types=1);

namespace App\Exception;

use RuntimeException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Błąd wysyłki przez SMTP — szczegóły (odpowiedź serwera) trafiają tylko do logu serwera, nigdy do przeglądarki. */
final class MailException extends RuntimeException
{
}
