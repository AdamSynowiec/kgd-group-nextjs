<?php

declare(strict_types=1);

/**
 * Jednorazowe narzędzie: generuje token dla zewnętrznego systemu (ingest.php).
 * Token przekaż partnerowi (nagłówek Authorization: Bearer), a linię "kid:hash"
 * dopisz do BLOG_INGEST_TOKENS w .env — sam token nigdzie u nas nie jest zapisany.
 * Uruchom lokalnie (php backend/tools/generate-ingest-token.php firma-2026a);
 * nie wgrywaj na serwer.
 */

$kid = $argv[1] ?? 'partner-' . date('Y');
$token = bin2hex(random_bytes(32));

echo "TOKEN (dla partnera, pokazany tylko raz): {$token}\n";
echo "BLOG_INGEST_TOKENS entry (do .env):        {$kid}:" . hash('sha256', $token) . "\n";
