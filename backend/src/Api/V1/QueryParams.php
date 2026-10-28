<?php

declare(strict_types=1);

namespace App\Api\V1;

use App\Api\Problem;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Parametry zapytania endpointu: tylko dozwolone nazwy, każda wartość jako pojedynczy tekst
 * (bez tablic "a[]=1"), błędy zbierane razem i zgłaszane jednym 400 (Problem::invalidParameters).
 */
final class QueryParams
{
    /** @var array<string, string> */
    private array $values = [];

    /** @var list<array{name: string, reason: string}> */
    private array $invalid = [];

    /**
     * @param array<string, mixed> $query zwykle $_GET
     * @param list<string> $allowed
     */
    public function __construct(array $query, array $allowed)
    {
        unset($query['route']); // forma zapasowa adresu (/api/v1.php?route=...)
        foreach ($query as $name => $value) {
            $name = (string) $name;
            if (!in_array($name, $allowed, true)) {
                $this->invalid($name, 'Unknown parameter. Allowed: ' . ($allowed === [] ? 'none' : implode(', ', $allowed)) . '.');
            } elseif (!is_string($value)) {
                $this->invalid($name, 'Expected a single value.');
            } else {
                $this->values[$name] = trim($value);
            }
        }
    }

    public function raw(string $name): ?string
    {
        return $this->values[$name] ?? null;
    }

    /** Parametry, które przyszły — do linków paginacji (bez limit/offset). @return array<string, string> */
    public function present(): array
    {
        return array_diff_key($this->values, ['limit' => true, 'offset' => true]);
    }

    public function invalid(string $name, string $reason): void
    {
        $this->invalid[] = ['name' => $name, 'reason' => $reason];
    }

    public function assertValid(): void
    {
        if ($this->invalid !== []) {
            throw Problem::invalidParameters($this->invalid);
        }
    }

    /**
     * Lista wartości po przecinku, każda z dozwolonego zbioru.
     *
     * @param list<string> $allowed
     * @return ?list<string>
     */
    public function list(string $name, array $allowed, string $example): ?array
    {
        $raw = $this->raw($name);
        if ($raw === null) {
            return null;
        }
        $list = self::split($raw);
        $unknown = array_values(array_diff($list, $allowed));
        if ($list === [] || $unknown !== []) {
            $this->invalid($name, ($list === [] ? "Expected a comma-separated list, e.g. \"{$example}\"." : 'Unknown value(s): ' . implode(', ', $unknown) . '.')
                . ' Allowed: ' . ($allowed === [] ? 'none' : implode(', ', $allowed)) . '.');

            return null;
        }

        return $list;
    }

    public function integer(string $name, int $default, int $min, int $max): int
    {
        $raw = $this->raw($name);
        if ($raw === null) {
            return $default;
        }
        $value = filter_var($raw, FILTER_VALIDATE_INT, ['options' => ['min_range' => $min, 'max_range' => $max]]);
        if ($value === false) {
            $this->invalid($name, "Expected an integer between {$min} and " . ($max === PHP_INT_MAX ? 'infinity' : $max) . '.');

            return $default;
        }

        return $value;
    }

    /** Data RFC 3339 ("2026-10-26T00:00:00Z", "2026-10-26T02:00:00+02:00") albo sama data ("2026-10-26", UTC). */
    public function timestamp(string $name): ?int
    {
        $raw = $this->raw($name);
        if ($raw === null) {
            return null;
        }
        $valid = preg_match('/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2}))?$/', $raw) === 1;
        $time = $valid ? strtotime(strlen($raw) === 10 ? $raw . 'T00:00:00Z' : $raw) : false;
        if ($time === false) {
            $this->invalid($name, 'Expected an RFC 3339 date-time, e.g. "2026-10-26T00:00:00Z", or a date "2026-10-26".');

            return null;
        }

        return $time;
    }

    /** @return list<string> */
    public static function split(string $value): array
    {
        return array_values(array_unique(array_filter(array_map('trim', explode(',', $value)), 'strlen')));
    }
}
