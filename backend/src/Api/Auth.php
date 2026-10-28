<?php

declare(strict_types=1);

namespace App\Api;

use App\Config\Config;
use App\Http\SessionAuth;
use App\Repository\MysqlApiTokenRepository;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Autoryzacja REST API v1: "Authorization: Bearer <token>" (RFC 6750), token z panelu
 * (Ustawienia → Tokeny API), sprawdzany po hashu. Każdy endpoint wymaga konkretnego zakresu.
 * Poza trybem debug tylko HTTPS — token wysłany otwartym tekstem trzeba by uznać za ujawniony.
 */
final class Auth
{
    /** Zakresy znane API — jedno miejsce prawdy, panel pokazuje je przy tworzeniu tokenu. */
    public const SCOPES = [
        'pages:read' => 'Odczyt opublikowanych stron, ich typów i pól z nadanym identyfikatorem',
    ];

    public function __construct(
        private readonly MysqlApiTokenRepository $tokens,
        private readonly Config $config
    ) {
    }

    /** @return array<string, mixed> rekord tokenu */
    public function require(string $scope): array
    {
        $https = ($_SERVER['HTTPS'] ?? 'off') !== 'off' || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
        if (!$https && !$this->config->isDebug()) {
            throw Problem::insecureTransport();
        }

        $presented = SessionAuth::tokenFromRequest();
        if ($presented === null || $presented === '') {
            throw Problem::unauthorized('Missing bearer token. Send "Authorization: Bearer <token>".');
        }

        $token = $this->tokens->findActiveByToken($presented);
        if ($token === null) {
            throw Problem::unauthorized('The token is invalid, expired or revoked.');
        }
        if (!in_array($scope, $token['scopes'], true)) {
            throw Problem::insufficientScope($scope);
        }

        $this->tokens->touch($token['id']);

        return $token;
    }
}
