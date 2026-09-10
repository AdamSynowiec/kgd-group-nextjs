<?php

declare(strict_types=1);

namespace App\Support;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Nakłada zmiany z żądania na treść zapisaną w bazie — ale TYLKO tam, gdzie
 * zapisana treść jest węzłem {"value": ..., "editable": true}. Wszystko inne
 * (pola bez tej struktury, węzły z editable:false, samo pole "editable")
 * zostaje dokładnie takie, jak w bazie, bez względu na to, co przyszło
 * w żądaniu.
 *
 * To jest realna walidacja, nie tylko UI: frontend nigdy nie jest źródłem
 * prawdy o tym, co wolno zmienić — struktura zapisanej treści jest jedyną
 * "listą dozwolonych pól", więc nie trzeba jej osobno utrzymywać.
 */
final class EditableMerge
{
    public static function apply(mixed $stored, mixed $incoming): mixed
    {
        if (Editable::isEditableNode($stored)) {
            if ($stored['editable'] !== true) {
                return $stored;
            }

            $incomingValue = Editable::isEditableNode($incoming) ? $incoming['value'] : $incoming;
            $incomingLabel = is_array($incoming) ? ($incoming['label'] ?? null) : null;

            $type = $stored['type'] ?? null;
            $value = Editable::isValidType($type)
                ? (self::matchesType($incomingValue, $type) ? $incomingValue : $stored['value'])
                : self::coerceSameType($stored['value'], $incomingValue);

            // Tylko "value" i "label" są edytowalne z panelu. "type" NIGDY nie
            // trafia do $overrides — array_merge poniżej więc zawsze zachowuje
            // to, co już było zapisane w $stored, bez względu na to, co
            // (jeśli cokolwiek) przyszło w żądaniu w polu "type".
            $overrides = [
                'value' => $value,
                'editable' => true,
            ];

            if (is_string($incomingLabel) && trim($incomingLabel) !== '') {
                $overrides['label'] = $incomingLabel;
            }

            // array_merge (nie tylko nadpisane klucze) zachowuje dodatkowe
            // klucze zapisane obok wartości w bazie — np. "type", "label",
            // gdy incoming go nie nadpisuje — które inaczej znikałyby przy
            // każdym zapisie z panelu.
            return array_merge($stored, $overrides);
        }

        if (is_array($stored) && array_is_list($stored)) {
            if (!is_array($incoming) || !array_is_list($incoming)) {
                return $stored;
            }

            $result = [];
            foreach ($stored as $index => $storedItem) {
                $result[] = self::apply($storedItem, $incoming[$index] ?? null);
            }

            return $result;
        }

        if (is_array($stored)) {
            $result = [];
            foreach ($stored as $key => $storedValue) {
                $incomingValue = is_array($incoming) && array_key_exists($key, $incoming) ? $incoming[$key] : null;
                $result[$key] = self::apply($storedValue, $incomingValue);
            }

            return $result;
        }

        // Liść bez struktury {value, editable} — nie da się go zmienić przez CMS.
        return $stored;
    }

    /**
     * Awaryjna ścieżka dla węzłów bez (jeszcze) poprawnego "type" — nie
     * pozwala zmienić TYPU wartości (np. string -> tablica), tylko jej treść.
     * Po migracji (scripts/migrate-field-types.mjs) nie powinna być już
     * używana dla realnej treści, ale zostaje jako bezpieczny fallback.
     */
    private static function coerceSameType(mixed $storedValue, mixed $incomingValue): mixed
    {
        if (gettype($storedValue) !== gettype($incomingValue)) {
            return $storedValue;
        }

        return $incomingValue;
    }

    /** Prawdziwa walidacja względem zadeklarowanego "type" pola — patrz Editable::FIELD_TYPES. */
    private static function matchesType(mixed $value, string $type): bool
    {
        return match ($type) {
            // "richtext" to na poziomie przechowywania string z HTML-em — tak samo jak "string"/"asset",
            // odróżnia je tylko to, który edytor panel pokazuje (patrz src/components/admin/fields/registry.ts).
            // Oczyszczanie HTML-a (DOMPurify) dzieje się w przeglądarce przy każdej zmianie w RichTextEditor.tsx,
            // nie tutaj — backend ufa zalogowanemu redaktorowi tak samo jak przy każdym innym polu treści.
            'string', 'asset', 'richtext' => is_string($value),
            'bool' => is_bool($value),
            'number' => is_int($value) || is_float($value),
            'table' => self::isValidTableValue($value),
            default => false,
        };
    }

    private static function isScalar(mixed $value): bool
    {
        return is_string($value) || is_int($value) || is_float($value) || is_bool($value);
    }

    /**
     * "table" obejmuje w tym systemie trzy realne kształty (patrz
     * src/lib/fieldType.ts::classifyFieldType i TableEditor.tsx):
     *   - listę skalarów (np. lista zakładek nawigacji),
     *   - listę obiektów o polach skalarnych LUB zagnieżdżonych tablicach
     *     (np. "apartments" z polem "images": [...] w każdym wierszu),
     *   - płaski słownik klucz/wartość, gdzie liście to skalary albo obiekty
     *     skalarów o jeden poziom głębiej (np. "consents").
     * Odrzuca tylko ewidentnie złe zamienniki (np. zwykły string zamiast
     * tabeli) — nie wymusza identycznego zestawu kluczy w każdym wierszu.
     */
    private static function isValidTableValue(mixed $value): bool
    {
        if (!is_array($value)) {
            return false;
        }

        if (array_is_list($value)) {
            foreach ($value as $item) {
                if (!self::isScalar($item) && !is_array($item)) {
                    return false;
                }
            }

            return true;
        }

        foreach ($value as $item) {
            if (self::isScalar($item)) {
                continue;
            }

            if (is_array($item) && !array_is_list($item)) {
                foreach ($item as $leaf) {
                    if (!self::isScalar($leaf)) {
                        return false;
                    }
                }

                continue;
            }

            return false;
        }

        return true;
    }
}
