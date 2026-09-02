<?php

declare(strict_types=1);

/**
 * Jednorazowe narzędzie: czyści PHP OPcache na serwerze. Przydatne, gdy po
 * podmianie pliku przez FTP serwer nadal wykonuje starą, wcześniej
 * skompilowaną wersję — typowe na hostingach z opcache.validate_timestamps=0,
 * gdzie OPcache nie sprawdza automatycznie, czy plik na dysku się zmienił.
 *
 * NIE jest częścią aplikacji — świadomie NIE ma go w kroku CI, który wgrywa
 * backend/ na serwer. Wgraj ten JEDEN plik ręcznie przez FTP, użyj raz, usuń.
 *
 * Użycie: curl https://twojadomena.pl/api/tools/clear-opcache.php
 */

header('Content-Type: text/plain; charset=utf-8');

if (!function_exists('opcache_reset')) {
    echo "OPcache nie jest wlaczony w tej instalacji PHP -- to nie jest przyczyna problemu.\n";
    exit;
}

$cleared = opcache_reset();

echo $cleared
    ? "OPcache wyczyszczony. Sprobuj ponownie.\n"
    : "Nie udalo sie wyczyscic OPcache (byc moze opcache.restrict_api blokuje dostep z web SAPI) -- zglos to hostingowi albo popros o restart PHP-FPM.\n";
