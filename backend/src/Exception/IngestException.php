<?php

declare(strict_types=1);

namespace App\Exception;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Błąd API dla zewnętrznego systemu: status HTTP + stabilny kod maszynowy + opcjonalne błędy per pole. */
final class IngestException extends ApiException
{
    /** @param array<string, string> $fields */
    public function __construct(
        int $status,
        public readonly string $errorCode,
        string $message,
        public readonly array $fields = []
    ) {
        parent::__construct($message, $status);
    }

    /** @param array<string, string> $fields */
    public static function validation(array $fields): self
    {
        return new self(422, 'VALIDATION_ERROR', 'Request validation failed', $fields);
    }
}
