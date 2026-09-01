<?php

declare(strict_types=1);

namespace App\Http;

use App\Exception\ApiException;
use JsonException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Odpala workflow GitHub Actions przez REST API (workflow_dispatch) — to,
 * co normalnie robi przycisk "Run workflow" w zakładce Actions, ale wołane
 * z panelu, bez pushowania commita.
 *
 * Świadomie file_get_contents() + stream_context, nie curl: mniej pewne, czy
 * curl jest włączony na tanim/darmowym hostingu, a allow_url_fopen jest
 * włączony domyślnie w PHP i nie wymaga żadnego rozszerzenia.
 */
final class GithubDispatcher
{
    public function __construct(
        private readonly string $token,
        private readonly string $owner,
        private readonly string $repo,
        private readonly string $workflow,
        private readonly string $ref
    ) {
    }

    public function dispatch(): void
    {
        if ($this->token === '' || $this->owner === '' || $this->repo === '') {
            throw new ApiException(
                'Panel nie ma skonfigurowanego GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO w .env.',
                500
            );
        }

        $url = sprintf(
            'https://api.github.com/repos/%s/%s/actions/workflows/%s/dispatches',
            rawurlencode($this->owner),
            rawurlencode($this->repo),
            rawurlencode($this->workflow)
        );

        try {
            $payload = json_encode(['ref' => $this->ref], JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ApiException('Nie udało się zbudować żądania do GitHub API.', 500);
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", [
                    "Authorization: Bearer {$this->token}",
                    'Accept: application/vnd.github+json',
                    'User-Agent: kgd-group-admin-panel',
                    'X-GitHub-Api-Version: 2022-11-28',
                    'Content-Type: application/json',
                ]),
                'content' => $payload,
                // Bez tego file_get_contents() zwraca false na 4xx/5xx i tracimy treść błędu z GitHuba.
                'ignore_errors' => true,
                'timeout' => 15,
            ],
        ]);

        $body = @file_get_contents($url, false, $context);
        $status = self::statusFromHeaders($http_response_header ?? []);

        // 204 No Content = GitHub przyjął zlecenie uruchomienia workflow.
        if ($status === 204) {
            return;
        }

        $reason = self::extractMessage($body) ?? "GitHub API zwróciło status {$status}.";
        throw new ApiException("Nie udało się uruchomić builda: {$reason}", 502);
    }

    /** @param string[] $headers */
    private static function statusFromHeaders(array $headers): int
    {
        foreach ($headers as $header) {
            if (preg_match('#^HTTP/\S+\s+(\d+)#', $header, $matches) === 1) {
                return (int) $matches[1];
            }
        }

        return 0;
    }

    private static function extractMessage(string|false $body): ?string
    {
        if ($body === false || $body === '') {
            return null;
        }

        $decoded = json_decode($body, true);

        return is_array($decoded) && isset($decoded['message']) ? (string) $decoded['message'] : null;
    }
}
