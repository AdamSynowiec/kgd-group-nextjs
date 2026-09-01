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
 * z panelu — i pozwala potem sprawdzić, jak ten przebieg stoi.
 *
 * GitHub NIE zwraca id przebiegu w odpowiedzi na dispatch (to zwykłe 204).
 * Żeby później znaleźć "ten" przebieg, dispatch() zapamiętuje własny znacznik
 * czasu SPRZED wywołania, a findRunStatus() szuka wśród ostatnich przebiegów
 * workflow_dispatch tego, który powstał nie wcześniej niż ten znacznik
 * (z 30-sekundowym marginesem na drobne różnice zegarów/opóźnienia sieci).
 *
 * Świadomie file_get_contents() + stream_context, nie curl: mniej pewne, czy
 * curl jest włączony na tanim/darmowym hostingu, a allow_url_fopen jest
 * włączony domyślnie w PHP i nie wymaga żadnego rozszerzenia.
 */
final class GithubDispatcher
{
    private const RUN_LOOKUP_BUFFER_SECONDS = 30;

    public function __construct(
        private readonly string $token,
        private readonly string $owner,
        private readonly string $repo,
        private readonly string $workflow,
        private readonly string $ref
    ) {
    }

    /** Zwraca znacznik czasu (ISO 8601, UTC) do przekazania później do findRunStatus(). */
    public function dispatch(): string
    {
        $this->assertConfigured();

        $dispatchedAt = gmdate('Y-m-d\TH:i:s\Z');

        try {
            $payload = json_encode(['ref' => $this->ref], JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new ApiException('Nie udało się zbudować żądania do GitHub API.', 500);
        }

        $url = sprintf(
            'https://api.github.com/repos/%s/%s/actions/workflows/%s/dispatches',
            rawurlencode($this->owner),
            rawurlencode($this->repo),
            rawurlencode($this->workflow)
        );

        $response = $this->send('POST', $url, $payload);

        // 204 No Content = GitHub przyjął zlecenie uruchomienia workflow.
        if ($response['status'] !== 204) {
            $reason = self::extractMessage($response['body']) ?? "GitHub API zwróciło status {$response['status']}.";
            throw new ApiException("Nie udało się uruchomić builda: {$reason}", 502);
        }

        return $dispatchedAt;
    }

    /**
     * @return array{status: string, conclusion: string|null, htmlUrl: string|null, runNumber: int|null}|null
     *         null = GitHub jeszcze nie pokazuje tego przebiegu na liście (typowe kilka sekund po dispatchu) — pytaj ponownie.
     */
    public function findRunStatus(string $sinceIso): ?array
    {
        $this->assertConfigured();

        $sinceTimestamp = strtotime($sinceIso);
        if ($sinceTimestamp === false) {
            throw new ApiException('Nieprawidłowy format parametru "since".', 400);
        }
        $threshold = $sinceTimestamp - self::RUN_LOOKUP_BUFFER_SECONDS;

        $url = sprintf(
            'https://api.github.com/repos/%s/%s/actions/workflows/%s/runs?event=workflow_dispatch&per_page=5',
            rawurlencode($this->owner),
            rawurlencode($this->repo),
            rawurlencode($this->workflow)
        );

        $response = $this->send('GET', $url);

        if ($response['status'] !== 200) {
            $reason = self::extractMessage($response['body']) ?? "GitHub API zwróciło status {$response['status']}.";
            throw new ApiException("Nie udało się pobrać statusu builda: {$reason}", 502);
        }

        $decoded = self::decodeJson($response['body']);
        $runs = is_array($decoded['workflow_runs'] ?? null) ? $decoded['workflow_runs'] : [];

        foreach ($runs as $run) {
            $createdAt = is_string($run['created_at'] ?? null) ? strtotime($run['created_at']) : false;

            if ($createdAt !== false && $createdAt >= $threshold) {
                return [
                    'status' => (string) ($run['status'] ?? 'unknown'),
                    'conclusion' => isset($run['conclusion']) && is_string($run['conclusion']) ? $run['conclusion'] : null,
                    'htmlUrl' => isset($run['html_url']) && is_string($run['html_url']) ? $run['html_url'] : null,
                    'runNumber' => isset($run['run_number']) ? (int) $run['run_number'] : null,
                ];
            }
        }

        return null;
    }

    private function assertConfigured(): void
    {
        if ($this->token === '' || $this->owner === '' || $this->repo === '') {
            throw new ApiException(
                'Panel nie ma skonfigurowanego GITHUB_TOKEN/GITHUB_OWNER/GITHUB_REPO w .env.',
                500
            );
        }
    }

    /** @return array{status: int, body: string|false} */
    private function send(string $method, string $url, ?string $payload = null): array
    {
        $headers = [
            "Authorization: Bearer {$this->token}",
            'Accept: application/vnd.github+json',
            'User-Agent: kgd-group-admin-panel',
            'X-GitHub-Api-Version: 2022-11-28',
        ];
        if ($payload !== null) {
            $headers[] = 'Content-Type: application/json';
        }

        $context = stream_context_create([
            'http' => [
                'method' => $method,
                'header' => implode("\r\n", $headers),
                'content' => $payload,
                // Bez tego file_get_contents() zwraca false na 4xx/5xx i tracimy treść błędu z GitHuba.
                'ignore_errors' => true,
                'timeout' => 15,
            ],
        ]);

        $body = @file_get_contents($url, false, $context);

        return ['status' => self::statusFromHeaders($http_response_header ?? []), 'body' => $body];
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

    /** @return array<string, mixed> */
    private static function decodeJson(string|false $body): array
    {
        if ($body === false || $body === '') {
            return [];
        }

        $decoded = json_decode($body, true);

        return is_array($decoded) ? $decoded : [];
    }

    private static function extractMessage(string|false $body): ?string
    {
        $decoded = self::decodeJson($body);

        return isset($decoded['message']) && is_string($decoded['message']) ? $decoded['message'] : null;
    }
}
