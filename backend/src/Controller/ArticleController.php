<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\IngestException;
use App\Http\JsonResponse;
use App\Repository\ActivityLogRepositoryInterface;
use App\Repository\PageRepositoryInterface;
use App\Support\ArticleValidator;
use App\Support\BlogArticlePage;
use DateTimeZone;
use JsonException;
use PDOException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/** Endpointy artykułów bloga dla zewnętrznego systemu (ingest.php). Tylko zapis do bazy — nic nie buduje ani nie publikuje strony. */
final class ArticleController
{
    private const MAX_BODY_BYTES = 262144;

    public function __construct(
        private readonly PageRepositoryInterface $pages,
        private readonly ActivityLogRepositoryInterface $activity
    ) {
    }

    /** POST /blog/articles — tworzy nowy artykuł; istniejący slug nigdy nie jest nadpisywany (409). */
    public function create(string $tokenId): void
    {
        $article = ArticleValidator::validate($this->readJsonBody());
        $page = BlogArticlePage::build($article);

        // created_at = publish_date (UTC), bo lista bloga sortuje "najnowsze pierwsze" po created_at.
        $createdAt = $article['publish_date']->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');

        try {
            $created = $this->pages->create($article['slug'], $page, $createdAt);
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                throw new IngestException(409, 'SLUG_CONFLICT', 'An article with this slug already exists.');
            }

            throw $exception;
        }

        $this->activity->log(null, "api:{$tokenId}", 'blog.article.create', $article['slug']);

        JsonResponse::send([
            'success' => true,
            'id' => $created['id'],
            'slug' => $article['slug'],
            'status' => 'created',
            'publish_status' => $page['status'],
        ], 201);
    }

    /** @return array<string, mixed> */
    private function readJsonBody(): array
    {
        if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
            throw new IngestException(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.');
        }

        // Czytamy o 1 bajt ponad limit — wystarczy, by wykryć przekroczenie bez wczytywania całego body.
        $raw = stream_get_contents(fopen('php://input', 'r'), self::MAX_BODY_BYTES + 1) ?: '';

        if (strlen($raw) > self::MAX_BODY_BYTES) {
            throw new IngestException(413, 'PAYLOAD_TOO_LARGE', 'Request body must not exceed ' . self::MAX_BODY_BYTES . ' bytes.');
        }

        try {
            $data = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new IngestException(400, 'MALFORMED_JSON', 'Request body is not valid JSON.');
        }

        if (!is_array($data) || array_is_list($data)) {
            throw new IngestException(400, 'BAD_REQUEST', 'Request body must be a JSON object.');
        }

        return $data;
    }
}
