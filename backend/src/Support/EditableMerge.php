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

            return [
                'value' => self::coerceSameType($stored['value'], $incomingValue),
                'editable' => true,
            ];
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

    /** Nie pozwala zmienić TYPU wartości (np. string -> tablica), tylko jej treść. */
    private static function coerceSameType(mixed $storedValue, mixed $incomingValue): mixed
    {
        if (gettype($storedValue) !== gettype($incomingValue)) {
            return $storedValue;
        }

        return $incomingValue;
    }
}
