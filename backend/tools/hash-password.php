<?php

declare(strict_types=1);

/**
 * Jednorazowe narzędzie: generuje hash hasła do wstawienia w tabeli `users`
 * (kolumna password). NIE jest częścią aplikacji — świadomie NIE ma go
 * w kroku CI, który wgrywa backend/ na serwer (patrz .github/workflows/deploy.yml).
 * Wgraj ten JEDEN plik ręcznie przez FTP, użyj raz, usuń.
 *
 * Użycie (POST, nie GET — żeby hasło nie wylądowało w logu dostępu serwera,
 * URL-e z parametrami GET bywają logowane, treść POST-a nie):
 *   curl -d password=twoje-haslo https://twojadomena.pl/api/tools/hash-password.php
 */

header('Content-Type: text/plain; charset=utf-8');

$password = $_POST['password'] ?? null;

if (!is_string($password) || $password === '') {
    http_response_code(400);
    echo "Wyslij POST z polem \"password\".\n";
    echo "Przyklad: curl -d password=twoje-haslo <ten-adres>\n";
    exit;
}

echo password_hash($password, PASSWORD_DEFAULT) . "\n";
