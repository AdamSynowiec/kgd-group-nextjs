<?php

declare(strict_types=1);

/**
 * Jednorazowe narzędzie: generuje losowy sekret pod SESSION_SECRET w .env
 * (podpisywanie tokenów sesji, patrz backend/src/Http/SessionToken.php).
 * NIE jest częścią aplikacji — świadomie NIE ma go w kroku CI. Wgraj ten
 * JEDEN plik ręcznie przez FTP, użyj raz, usuń.
 *
 * Użycie: curl https://twojadomena.pl/api/tools/generate-secret.php
 */

header('Content-Type: text/plain; charset=utf-8');

echo bin2hex(random_bytes(32)) . "\n";
