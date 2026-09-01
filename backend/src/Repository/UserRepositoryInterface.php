<?php

declare(strict_types=1);

namespace App\Repository;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

interface UserRepositoryInterface
{
    /** @return array{id: int, login: string, password: string, role: string}|null */
    public function findByLogin(string $login): ?array;
}
