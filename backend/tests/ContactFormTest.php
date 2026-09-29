<?php

declare(strict_types=1);

/**
 * Test bez frameworka, uruchamiany ręcznie:
 *   php backend/tests/ContactFormTest.php
 * Sprawdza walidację formularzy (ContactForm), listę dozwolonych odbiorców
 * budowę maila (SmtpMailer::buildMessage) — w tym brak wstrzykiwania nagłówków —
 * i dane wysyłane do CRM (CrmWebhook::buildPayload) w formacie starego serwera.
 */

define('APP_ENTRY', true);

require __DIR__ . '/../src/Exception/MailException.php';
require __DIR__ . '/../src/Support/ContactForm.php';
require __DIR__ . '/../src/Support/SmtpMailer.php';
require __DIR__ . '/../src/Support/CrmWebhook.php';

use App\Exception\MailException;
use App\Support\ContactForm;
use App\Support\CrmWebhook;
use App\Support\SmtpMailer;

$failures = [];

function check(string $name, mixed $actual, mixed $expected): void
{
    global $failures;
    $ok = $actual === $expected;
    echo ($ok ? 'PASS' : 'FAIL') . " - {$name}\n";
    if (!$ok) {
        $failures[] = $name;
        echo '  expected: ' . json_encode($expected, JSON_UNESCAPED_UNICODE) . "\n";
        echo '  actual:   ' . json_encode($actual, JSON_UNESCAPED_UNICODE) . "\n";
    }
}

function contact(array $override = []): array
{
    return $override + [
        'name' => 'Jan Kowalski', 'email' => 'jan@example.com', 'phone' => '600700800', 'country' => 'PL',
        'subject' => 'Pytanie o M 3', 'message' => "Dzień dobry,\nproszę o kontakt.", 'address' => '',
        'consent' => true, 'consentEmail' => true, 'consentPhone' => true,
    ];
}

// --- formularz kontaktowy ---------------------------------------------------
[$errors, $data] = ContactForm::validateContact(contact());
check('valid contact passes', $errors, []);
check('phone normalized with dial code', $data['phone'], '+48 600700800');
check('missing fields reported together', array_keys(ContactForm::validateContact([])[0]), ['name', 'subject', 'message', 'email', 'phone', 'consent', 'consentEmail', 'consentPhone']);
check('invalid email rejected', array_keys(ContactForm::validateContact(contact(['email' => 'nie-mail']))[0]), ['email']);
check('phone with wrong length rejected', array_keys(ContactForm::validateContact(contact(['phone' => '12345']))[0]), ['phone']);
check('phone length per country (DE 11)', ContactForm::validateContact(contact(['country' => 'DE', 'phone' => '12345678901']))[0], []);
check('unknown country rejected', array_keys(ContactForm::validateContact(contact(['country' => 'XX']))[0]), ['phone']);
check('consent must be literally true', array_keys(ContactForm::validateContact(contact(['consentPhone' => 'yes']))[0]), ['consentPhone']);
check('newline in subject rejected (header injection)', array_keys(ContactForm::validateContact(contact(['subject' => "a\r\nBcc: x@y.pl"]))[0]), ['subject']);
check('too long message rejected', array_keys(ContactForm::validateContact(contact(['message' => str_repeat('a', 5001)]))[0]), ['message']);
check('non-string name rejected', array_keys(ContactForm::validateContact(contact(['name' => ['x']]))[0]), ['name']);
check('honeypot filled = spam', ContactForm::isSpam(contact(['address' => 'ul. Botowa 1'])), true);
check('honeypot empty = not spam', ContactForm::isSpam(contact()), false);

// --- szybki kontakt ---------------------------------------------------------
[$errors, $data] = ContactForm::validateQuickContact(['phone' => '600700800', 'country' => 'PL', 'consent' => true, 'site' => 'https://kgd-group.pl/inwestycja/rudava-park']);
check('valid quick contact passes', $errors, []);
check('quick contact keeps page url', $data['site'], 'https://kgd-group.pl/inwestycja/rudava-park');
check('quick contact requires consent', array_keys(ContactForm::validateQuickContact(['phone' => '600700800', 'country' => 'PL'])[0]), ['consent']);
check('quick contact drops non-http site', ContactForm::validateQuickContact(['phone' => '600700800', 'country' => 'PL', 'consent' => true, 'site' => 'javascript:alert(1)'])[1]['site'], '');

// --- odbiorca wskazany przez stronę -----------------------------------------
$allowed = ContactForm::parseList('sprzedaz@kgd-group.pl, @pylnaresidence.pl');
check('exact address allowed', ContactForm::isAllowedTarget('Sprzedaz@kgd-group.pl', $allowed), true);
check('whole domain allowed', ContactForm::isAllowedTarget('sprzedaz@pylnaresidence.pl', $allowed), true);
check('other address rejected', ContactForm::isAllowedTarget('ktos@gmail.com', $allowed), false);
check('lookalike domain rejected', ContactForm::isAllowedTarget('x@evilpylnaresidence.pl', $allowed), false);
check('empty allow-list rejects all', ContactForm::isAllowedTarget('sprzedaz@kgd-group.pl', []), false);

// --- budowa maila -----------------------------------------------------------
$raw = SmtpMailer::buildMessage('formularz@kgd-group.pl', 'KGD Group – formularz', ['sprzedaz@kgd-group.pl'], 'Zażółć gęślą jaźń', "Linia 1\n.kropka na początku", 'jan@example.com');
[$head, $body] = explode("\r\n\r\n", $raw, 2);
check('subject encoded as UTF-8 (RFC 2047)', str_contains($head, 'Subject: =?UTF-8?B?'), true);
check('reply-to set', str_contains($head, "\r\nReply-To: jan@example.com"), true);
check('body decodes back to UTF-8 text with CRLF', base64_decode(str_replace("\r\n", '', $body)), "Linia 1\r\n.kropka na początku");
$threw = false;
try {
    SmtpMailer::buildMessage('formularz@kgd-group.pl', '', ["x@y.pl\r\nBcc: z@w.pl"], 'T', 'B');
} catch (MailException) {
    $threw = true;
}
check('recipient with CRLF rejected', $threw, true);
check('name with CRLF cannot add header', str_contains(SmtpMailer::buildMessage('a@b.pl', "Zły\r\nBcc: x@y.pl", ['c@d.pl'], 'T', 'B'), "\r\nBcc:"), false);

// --- CRM (format starego serwera modules/ext_mailer) -------------------------
$crmData = ['name' => 'Jan "Kowal"', 'email' => 'jan@example.com', 'message' => "A & B\n'c'"];
$payload = CrmWebhook::buildPayload($crmData, ['phone' => '600 700 800', 'target' => 'sprzedaz@pylnaresidence.pl', 'utm' => ['utm_source' => 'google', 'utm_medium' => 'cpc', 'utm_campaign' => 'x']]);
check('crm: key order like old crmRequest', array_keys($payload), ['name', 'email', 'phone', 'message', 'target', 'domain', 'utm']);
check('crm: values html-escaped like old validate()', [$payload['name'], $payload['message']], ['Jan &quot;Kowal&quot;', "A &amp; B\n&#039;c&#039;"]);
check('crm: phone digits only', $payload['phone'], '600700800');
check('crm: domain from target', $payload['domain'], 'pylnaresidence.pl');
check('crm: utm nested source/medium/campaign', $payload['utm'], ['source' => 'google', 'medium' => 'cpc', 'campaign' => 'x']);
check('crm: no utm -> nulls', CrmWebhook::buildPayload($crmData, [])['utm'], ['source' => null, 'medium' => null, 'campaign' => null]);
check('crm: missing target -> default target', CrmWebhook::buildPayload($crmData, [], 'formularz@krj307-2.pl')['domain'], 'krj307-2.pl');
check('crm: invalid target and no default -> null', CrmWebhook::buildPayload($crmData, ['target' => 'nie-mail'])['target'], null);
check('crm: disabled without url', (new CrmWebhook(''))->isEnabled(), false);

// --- szybki kontakt jak stary moduł ext_push_bot ------------------------------
check('quick: source = last path segment', ContactForm::quickSource('https://kgd-group.pl/inwestycja/rudava-park/'), 'rudava-park');
check('quick: source of homepage = host', ContactForm::quickSource('https://kgd-group.pl/'), 'kgd-group.pl');
check('quick: domain /inwestycja/{slug}', ContactForm::quickDomain('https://kgd-group.pl/inwestycja/rudava-park/'), 'rudava-park.pl');
check('quick: domain of kgd-building', ContactForm::quickDomain('https://kgd-group.pl/kgd-building/x/'), 'kgd-building.pl');
check('quick: domain of homepage', ContactForm::quickDomain('https://kgd-group.pl/'), 'kgd-group.pl');
check('quick: domain of other page', ContactForm::quickDomain('https://kgd-group.pl/blog/wpis/'), 'kgd-group.pl');
check('quick: kgd-building detected', ContactForm::isKgdBuildingSite('https://kgd-group.pl/kgd-building/'), true);
$quickBody = ['phone' => '600700800', 'name' => '', 'email' => '', 'message' => 'KONTAKT TELEFONICZNY', 'utm' => ['utm_source' => 'google']];
$quickData = ['phone' => '+48 600700800', 'site' => 'https://kgd-group.pl/inwestycja/rudava-park/'];
$quick = CrmWebhook::buildQuickPayload($quickData, $quickBody);
check('quick crm: key order like ext_push_bot', array_keys($quick), ['name', 'email', 'phone', 'message', 'target', 'site', 'utm', 'domain']);
check('quick crm: empty name/email -> null', [$quick['name'], $quick['email']], [null, null]);
check('quick crm: phone digits as typed', $quick['phone'], '600700800');
check('quick crm: default target', $quick['target'], 'kontakt@kgd-group.pl');
check('quick crm: domain from site', $quick['domain'], 'rudava-park.pl');
check('quick crm: utm', $quick['utm'], ['source' => 'google', 'medium' => null, 'campaign' => null]);
check('quick crm: kgd-building target', CrmWebhook::buildQuickPayload(['phone' => '1', 'site' => 'https://kgd-group.pl/kgd-building/'], $quickBody)['target'], 'kontakt@kgd-building.pl');
check('quick mail body has phone, source and ip', str_contains(ContactForm::quickContactBody($quickData, 'rudava-park', '1.2.3.4'), "Telefon: +48 600700800\n"), true);

echo "\n" . (count($failures) === 0 ? 'ALL PASS' : count($failures) . ' FAILED: ' . implode(', ', $failures)) . "\n";
exit(count($failures) === 0 ? 0 : 1);
