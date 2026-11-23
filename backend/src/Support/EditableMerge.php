<?php

declare(strict_types=1);

namespace App\Support;

use App\Exception\ApiException;

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
    /**
     * $role — rola wołającego (patrz Acl.php), domyślnie null (= sprawdzanie ACL
     * pominięte, tak jak przed wprowadzeniem ACL) dla wstecznej zgodności z
     * istniejącymi wywołaniami/testami. AdminController::savePage() przekazuje
     * tu realną rolę z sesji.
     *
     * $pageAcl — "acl" CAŁEJ strony (jej najwyższy poziom, patrz Page.acl w
     * src/lib/content.ts), używane jako DOMYŚLNE acl dla pola, które nie ma
     * WŁASNEGO "acl". Bez tego rola z prawem zapisu do strony (np. "blog" do
     * własnego wpisu, patrz AdminController::createPage()) nie mogłaby
     * zmienić żadnego pojedynczego pola — każde pole bez własnego "acl"
     * byłoby i tak zablokowane jako "tylko admin" (patrz Acl::check), mimo
     * dostępu do całej strony. Pole z WŁASNYM "acl" nadal je nadpisuje (np.
     * jedno pole zablokowane dla adminów na stronie poza tym współdzielonej
     * z inną rolą) — mirror identycznej logiki w EditableField.tsx.
     */
    public static function apply(mixed $stored, mixed $incoming, ?string $role = null, mixed $pageAcl = null): mixed
    {
        if (Editable::isEditableNode($stored)) {
            if ($stored['editable'] !== true) {
                return $stored;
            }

            // Brak WŁASNEGO "acl" na polu -> dziedziczy "acl" całej strony ($pageAcl);
            // brak obu -> tylko rola "admin" (patrz Acl::check).
            if (!Acl::canWrite($stored['acl'] ?? $pageAcl, $role)) {
                return $stored;
            }

            $incomingValue = Editable::isEditableNode($incoming) ? $incoming['value'] : $incoming;
            $incomingLabel = is_array($incoming) ? ($incoming['label'] ?? null) : null;

            // Rola "admin" może zmienić też DEFINICJĘ pola (type, format, details, acl) — edytor JSON
            // pola w panelu. Inne role: jak dotąd tylko value/label/apiKey.
            $definition = $role === 'admin' && is_array($incoming) && Editable::isEditableNode($incoming)
                ? self::definitionChanges($stored, $incoming)
                : [];

            $type = array_key_exists('type', $definition) ? $definition['type'] : ($stored['type'] ?? null);
            if (array_key_exists('type', $definition)) {
                // Zmiana typu: wartość musi pasować do NOWEGO typu — inaczej czytelny błąd zamiast cichego odrzucenia.
                if (!self::matchesType($incomingValue, $type)) {
                    throw new ApiException("Pole \"" . ($stored['label'] ?? '') . "\": wartość nie pasuje do typu \"{$type}\".", 422);
                }
                $value = $incomingValue;
            } else {
                $value = Editable::isValidType($type)
                    ? (self::matchesType($incomingValue, $type) ? $incomingValue : $stored['value'])
                    : self::coerceSameType($stored['value'], $incomingValue);
            }

            // Z panelu edytowalne są "value" i "label" (+ "apiKey" niżej). "type"/"format"/"details"/"acl"
            // zmienia wyłącznie admin przez $definition (sprawdzone w definitionChanges); dla innych ról
            // array_merge poniżej zachowuje to, co już było zapisane w $stored.
            $overrides = [
                'value' => $value,
                'editable' => true,
            ];

            if (is_string($incomingLabel) && trim($incomingLabel) !== '') {
                $overrides['label'] = $incomingLabel;
            }

            if ($definition !== []) {
                $stored = array_merge($stored, array_filter($definition, static fn (mixed $v): bool => $v !== null));
                foreach (array_keys(array_filter($definition, static fn (mixed $v): bool => $v === null)) as $removed) {
                    unset($stored[$removed]);
                }
            }

            // "apiKey" — klucz pola w REST API v1 (App\Api\PublicFields): edytowalny z panelu jak "label";
            // pusty usuwa pole z API. Brak klucza w żądaniu = bez zmian. Unikalność w obrębie strony
            // sprawdza AdminController::savePage().
            if (is_array($incoming) && array_key_exists('apiKey', $incoming)) {
                $apiKey = $incoming['apiKey'];
                if ($apiKey === null || $apiKey === '') {
                    $result = array_merge($stored, $overrides);
                    unset($result['apiKey']);

                    return $result;
                }
                if (!is_string($apiKey) || preg_match('/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/', $apiKey) !== 1) {
                    throw new ApiException('Klucz API pola: litery, cyfry i "_", zaczyna się od litery, maks. 64 znaki (np. heroTitle).', 422);
                }
                $overrides['apiKey'] = $apiKey;
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
                $result[] = self::apply($storedItem, $incoming[$index] ?? null, $role, $pageAcl);
            }

            return $result;
        }

        if (is_array($stored)) {
            $result = [];
            foreach ($stored as $key => $storedValue) {
                $incomingValue = is_array($incoming) && array_key_exists($key, $incoming) ? $incoming[$key] : null;
                $result[$key] = self::apply($storedValue, $incomingValue, $role, $pageAcl);
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

    /**
     * Zmiany definicji pola z edytora JSON (tylko rola "admin"): type, format, details, acl.
     * Klucz nieobecny w żądaniu = bez zmian; null = usunięcie (nie dotyczy "type").
     * "editable" i "value"/"label"/"apiKey" obsługuje apply() jak dotąd ("editable" nie da się
     * zmienić z panelu — wyłączenie edycji zablokowałoby pole na stałe).
     *
     * @param array<string, mixed> $stored
     * @param array<string, mixed> $incoming
     * @return array<string, mixed> tylko faktycznie zmienione klucze
     */
    private static function definitionChanges(array $stored, array $incoming): array
    {
        $label = (string) ($stored['label'] ?? '');
        $changes = [];

        if (array_key_exists('type', $incoming) && $incoming['type'] !== ($stored['type'] ?? null)) {
            if (!Editable::isValidType($incoming['type'])) {
                throw new ApiException("Pole \"{$label}\": nieznany typ. Dozwolone: " . implode(', ', Editable::FIELD_TYPES) . '.', 422);
            }
            $changes['type'] = $incoming['type'];
        }

        if (array_key_exists('format', $incoming) && $incoming['format'] !== ($stored['format'] ?? null)) {
            $format = $incoming['format'];
            if ($format === null || $format === '') {
                $changes['format'] = null;
            } elseif (is_string($format) && preg_match('/^[a-z][a-z0-9-]{0,31}$/', $format) === 1) {
                $changes['format'] = $format;
            } else {
                throw new ApiException("Pole \"{$label}\": \"format\" to krótki tekst z małych liter, np. \"inline\".", 422);
            }
        }

        if (array_key_exists('details', $incoming) && $incoming['details'] !== ($stored['details'] ?? null)) {
            $details = $incoming['details'];
            if ($details !== null && !is_string($details) && !is_array($details)) {
                throw new ApiException("Pole \"{$label}\": \"details\" musi być nazwą presetu albo obiektem.", 422);
            }
            $changes['details'] = $details;
        }

        if (array_key_exists('acl', $incoming) && $incoming['acl'] !== ($stored['acl'] ?? null)) {
            $acl = $incoming['acl'];
            $validList = is_array($acl) && array_is_list($acl) && $acl !== [] && count(Acl::entries($acl)) === count($acl);
            if ($acl !== null && !Acl::isValid($acl) && !$validList) {
                throw new ApiException("Pole \"{$label}\": \"acl\" ma postać {\"role\": \"…\", \"permission\": \"read|write|read/write\"} albo listy takich wpisów.", 422);
            }
            $changes['acl'] = $acl;
        }

        return $changes;
    }

    /** Prawdziwa walidacja względem zadeklarowanego "type" pola — patrz Editable::FIELD_TYPES. */
    private static function matchesType(mixed $value, string $type): bool
    {
        return match ($type) {
            // "richtext" to na poziomie przechowywania string z HTML-em — tak samo jak "string"/"asset",
            // odróżnia je tylko to, który edytor panel pokazuje (patrz src/components/admin/fields/registry.ts).
            // Oczyszczanie HTML-a (własny sanitizeHtml(), src/lib/richText/sanitizeHtml.ts) dzieje się w
            // przeglądarce przy każdej zmianie w RichTextEditor.tsx, nie tutaj — backend ufa zalogowanemu
            // redaktorowi tak samo jak przy każdym innym polu treści.
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
