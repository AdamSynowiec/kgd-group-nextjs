-- =============================================================================
-- 041: Fox Hills — podstrona "Polityka prywatności" (/inwestycja/foxhills/polityka-prywatnosci)
-- =============================================================================
-- Taka sama strona jak u pozostałych inwestycji (np. /inwestycja/rudava-park/polityka-prywatnosci):
-- osobny wiersz w `pages`, szablon "foxhills", jedna sekcja PrivacyPolicy
-- (src/components/shared/PrivacyPolicy.tsx, zarejestrowana już w foxhills/template.tsx).
-- Treść 1:1 z Rudava Park — zmienione tylko nazwa inwestycji, adresy (canonical/og) i dane administratora.
--
-- KROK 1: dane spółki-administratora poniżej (uzupełnione 2026-11-04 wg danych od klienta; każda inwestycja ma własną spółkę celową,
--         np. Rudava Park = WOLA JUSTOWSKA INWESTYCJE 2, Villa Verde = WOLA JUSTOWSKA INWESTYCJE 3).
--         Dopóki zostaje "UZUPELNIJ", skrypt NIC nie zapisuje.
-- KROK 2: mysql -u UZYTKOWNIK -p NAZWA_BAZY < db/041_foxhills_polityka_prywatnosci.sql
-- KROK 3: przebuduj/zrestartuj stronę (strony inwestycji są generowane statycznie, dynamicParams = false).
--
-- Cała treść w polu "body" (type richtext) — edytowalna w /admin edytorem tekstu (nagłówki, listy, pogrubienia).
-- Bezpieczne: dodaje nowy wiersz; jeśli strona już istnieje, tylko zamienia stare "blocks" na "body"
-- (raz — późniejsze edycje z panelu nie są nadpisywane). Strona /inwestycja/foxhills i inne strony nietknięte.
-- =============================================================================

SET NAMES utf8mb4;

SET @spolka   = 'KRAKOWSKA GRUPA DEWELOPERSKA';
SET @adres    = 'ul. Koło Strzelnicy 2/2, 30-219 Kraków, Polska';
SET @krs      = '0001106614';
SET @nip      = '6772510738';
SET @regon    = '528676390';

SET @tpl = '
{"slug":"/inwestycja/foxhills/polityka-prywatnosci","parent":"/inwestycja/foxhills","template":"foxhills","title":{"value":"Polityka prywatności – Fox Hills Residences","editable":true,"label":"Tytuł strony","type":"string"},"updatedAt":"2026-11-04","status":"published","nav":{"label":"Polityka prywatności","order":3},"seo":{"title":{"value":"Polityka prywatności – Fox Hills Residences","editable":true,"label":"Tytuł SEO","type":"string"},"description":{"value":"Zasady przetwarzania danych osobowych i plików cookies w serwisie inwestycji Fox Hills Residences. Informacje o administratorze i prawach użytkownika.","editable":true,"label":"Opis SEO","type":"string"},"keywords":["polityka prywatności","RODO","dane osobowe","cookies","Fox Hills Residences","KGD Group"],"canonical":"https://kgd-group.pl/inwestycja/foxhills/polityka-prywatnosci","robots":{"index":true,"follow":true},"author":"KGD Group","ogTitle":"Polityka prywatności – Fox Hills Residences","ogDescription":"Zasady przetwarzania danych osobowych i plików cookies w serwisie inwestycji Fox Hills Residences. Informacje o administratorze i prawach użytkownika.","ogImage":"https://kgd-group.pl/investments/foxhills/hero/hero-02.webp","ogType":"website","ogUrl":"https://kgd-group.pl/inwestycja/foxhills/polityka-prywatnosci","ogSiteName":"KGD Group","ogLocale":"pl_PL","twitterCard":"summary_large_image","twitterTitle":"Polityka prywatności – Fox Hills Residences","twitterDescription":"Zasady przetwarzania danych osobowych i plików cookies w serwisie inwestycji Fox Hills Residences. Informacje o administratorze i prawach użytkownika.","twitterImage":"https://kgd-group.pl/investments/foxhills/hero/hero-02.webp","language":"pl","structuredData":[{"type":"WebPage"}]},"sections":[{"id":"privacy-policy","component":"PrivacyPolicy","type":"section","label":"Treść polityki prywatności","fields":{"title":{"value":"Polityka prywatności","editable":true,"label":"Tytuł","type":"string"},"body":{"value":"<h2>1. Informacje ogólne</h2><p>Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych użytkowników korzystających ze strony internetowej.</p><p>Administratorem danych osobowych jest __SPOLKA__ z siedzibą przy __ADRES__.</p><p>Dane rejestrowe spółki:</p><ul><li>KRS: __KRS__</li><li>NIP: __NIP__</li><li>REGON: __REGON__</li></ul><p>Administrator dokłada szczególnej staranności w celu ochrony interesów osób, których dane dotyczą, a w szczególności zapewnia, że dane są przetwarzane zgodnie z obowiązującymi przepisami prawa.</p><h2>2. Zakres zbieranych danych</h2><p>Podczas korzystania ze strony mogą być zbierane następujące dane:</p><ul><li>imię i nazwisko</li><li>adres e-mail</li><li>numer telefonu</li><li>adres IP</li><li>dane dotyczące korzystania ze strony</li></ul><p>Dane są przekazywane dobrowolnie przez użytkownika, np. poprzez formularz kontaktowy.</p><h2>3. Cel przetwarzania danych</h2><p>Dane osobowe przetwarzane są w celu:</p><ul><li>udzielenia odpowiedzi na zapytanie przesłane przez formularz kontaktowy</li><li>realizacji usług lub kontaktu z użytkownikiem</li><li>prowadzenia statystyk dotyczących korzystania ze strony</li><li>prowadzenia działań marketingowych</li></ul><h2>4. Narzędzia analityczne i marketingowe</h2><h3>Google Analytics</h3><p>Strona korzysta z narzędzia Google Analytics, które umożliwia analizowanie statystyk ruchu na stronie internetowej. Dane zbierane są za pomocą plików cookies i mogą być przekazywane na serwery Google.</p><h3>Google Ads</h3><p>Strona może korzystać z systemu reklamowego Google Ads w celu prowadzenia kampanii reklamowych oraz remarketingu.</p><h3>Google Tag Manager</h3><p>Strona może korzystać z narzędzia Google Tag Manager umożliwiającego zarządzanie skryptami analitycznymi i marketingowymi.</p><h2>5. Pliki cookies</h2><p>Strona wykorzystuje pliki cookies w celu:</p><ul><li>zapewnienia prawidłowego działania strony</li><li>analizy ruchu na stronie</li><li>prowadzenia działań marketingowych i remarketingowych</li></ul><p>Użytkownik może w każdej chwili zmienić ustawienia dotyczące plików cookies w swojej przeglądarce internetowej.</p><h2>6. Prawa użytkownika</h2><p>Każda osoba, której dane dotyczą, ma prawo do:</p><ul><li>dostępu do swoich danych</li><li>sprostowania danych</li><li>usunięcia danych</li><li>ograniczenia przetwarzania</li><li>przenoszenia danych</li><li>cofnięcia zgody na przetwarzanie danych</li></ul><h2>7. Okres przechowywania danych</h2><p>Dane osobowe przechowywane są przez okres niezbędny do realizacji celu ich przetwarzania lub do momentu cofnięcia zgody przez użytkownika.</p><h2>8. Zmiany w polityce prywatności</h2><p>Administrator zastrzega sobie prawo do wprowadzania zmian w niniejszej Polityce Prywatności. Aktualna wersja dokumentu będzie publikowana na stronie internetowej.</p>","editable":true,"label":"Treść polityki prywatności","type":"richtext"}}}],"related":{"mode":"manual","manual":[]}}';

SET @content = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(@tpl,
  '__SPOLKA__', @spolka), '__ADRES__', @adres), '__KRS__', @krs),
  '__NIP__', @nip), '__REGON__', @regon);

SET @body = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE('{"value":"<h2>1. Informacje ogólne</h2><p>Niniejsza Polityka Prywatności określa zasady przetwarzania i ochrony danych osobowych użytkowników korzystających ze strony internetowej.</p><p>Administratorem danych osobowych jest __SPOLKA__ z siedzibą przy __ADRES__.</p><p>Dane rejestrowe spółki:</p><ul><li>KRS: __KRS__</li><li>NIP: __NIP__</li><li>REGON: __REGON__</li></ul><p>Administrator dokłada szczególnej staranności w celu ochrony interesów osób, których dane dotyczą, a w szczególności zapewnia, że dane są przetwarzane zgodnie z obowiązującymi przepisami prawa.</p><h2>2. Zakres zbieranych danych</h2><p>Podczas korzystania ze strony mogą być zbierane następujące dane:</p><ul><li>imię i nazwisko</li><li>adres e-mail</li><li>numer telefonu</li><li>adres IP</li><li>dane dotyczące korzystania ze strony</li></ul><p>Dane są przekazywane dobrowolnie przez użytkownika, np. poprzez formularz kontaktowy.</p><h2>3. Cel przetwarzania danych</h2><p>Dane osobowe przetwarzane są w celu:</p><ul><li>udzielenia odpowiedzi na zapytanie przesłane przez formularz kontaktowy</li><li>realizacji usług lub kontaktu z użytkownikiem</li><li>prowadzenia statystyk dotyczących korzystania ze strony</li><li>prowadzenia działań marketingowych</li></ul><h2>4. Narzędzia analityczne i marketingowe</h2><h3>Google Analytics</h3><p>Strona korzysta z narzędzia Google Analytics, które umożliwia analizowanie statystyk ruchu na stronie internetowej. Dane zbierane są za pomocą plików cookies i mogą być przekazywane na serwery Google.</p><h3>Google Ads</h3><p>Strona może korzystać z systemu reklamowego Google Ads w celu prowadzenia kampanii reklamowych oraz remarketingu.</p><h3>Google Tag Manager</h3><p>Strona może korzystać z narzędzia Google Tag Manager umożliwiającego zarządzanie skryptami analitycznymi i marketingowymi.</p><h2>5. Pliki cookies</h2><p>Strona wykorzystuje pliki cookies w celu:</p><ul><li>zapewnienia prawidłowego działania strony</li><li>analizy ruchu na stronie</li><li>prowadzenia działań marketingowych i remarketingowych</li></ul><p>Użytkownik może w każdej chwili zmienić ustawienia dotyczące plików cookies w swojej przeglądarce internetowej.</p><h2>6. Prawa użytkownika</h2><p>Każda osoba, której dane dotyczą, ma prawo do:</p><ul><li>dostępu do swoich danych</li><li>sprostowania danych</li><li>usunięcia danych</li><li>ograniczenia przetwarzania</li><li>przenoszenia danych</li><li>cofnięcia zgody na przetwarzanie danych</li></ul><h2>7. Okres przechowywania danych</h2><p>Dane osobowe przechowywane są przez okres niezbędny do realizacji celu ich przetwarzania lub do momentu cofnięcia zgody przez użytkownika.</p><h2>8. Zmiany w polityce prywatności</h2><p>Administrator zastrzega sobie prawo do wprowadzania zmian w niniejszej Polityce Prywatności. Aktualna wersja dokumentu będzie publikowana na stronie internetowej.</p>","editable":true,"label":"Treść polityki prywatności","type":"richtext"}',
  '__SPOLKA__', @spolka), '__ADRES__', @adres), '__KRS__', @krs),
  '__NIP__', @nip), '__REGON__', @regon);

INSERT INTO pages (slug, content)
SELECT '/inwestycja/foxhills/polityka-prywatnosci', @content
FROM DUAL
WHERE @content NOT LIKE '%UZUPELNIJ%'
  AND JSON_VALID(@content)
  AND NOT EXISTS (SELECT 1 FROM (SELECT slug FROM pages) AS p WHERE p.slug = '/inwestycja/foxhills/polityka-prywatnosci');

-- Strona już była zaimportowana poprzednią wersją tego pliku (treść w "blocks", nieedytowalna w panelu):
-- dodaj edytowalne pole "body" i usuń stare bloki. Tylko gdy "body" jeszcze nie ma — edycje z panelu zostają.
UPDATE pages
SET content = JSON_REMOVE(JSON_SET(content, '$.sections[0].fields.body', JSON_EXTRACT(@body, '$')), '$.sections[0].fields.blocks')
WHERE slug = '/inwestycja/foxhills/polityka-prywatnosci'
  AND JSON_UNQUOTE(JSON_EXTRACT(content, '$.sections[0].component')) = 'PrivacyPolicy'
  AND JSON_EXTRACT(content, '$.sections[0].fields.body') IS NULL
  AND @body NOT LIKE '%UZUPELNIJ%'
  AND JSON_VALID(@body);

-- Kontrola: 1 wiersz z tytułem i początkiem treści.
SELECT slug,
       JSON_UNQUOTE(JSON_EXTRACT(content, '$.title.value')) AS title,
       LEFT(JSON_UNQUOTE(JSON_EXTRACT(content, '$.sections[0].fields.body.value')), 300) AS tresc
FROM pages WHERE slug = '/inwestycja/foxhills/polityka-prywatnosci';
