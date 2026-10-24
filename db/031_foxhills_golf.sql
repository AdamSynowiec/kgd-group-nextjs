-- =============================================================================
-- 031: Fox Hills — sekcja "Wyjątkowe miejsce. Wyjątkowa gra." (Golf)
-- =============================================================================
-- Dopisuje do strony /inwestycja/foxhills sekcję o polu golfowym z katalogu
-- (Katalog FOX HILLS RESIDENCES, str. 7–8; teksty 1:1 z katalogu) — przed sekcją
-- Udogodnienia (Features), czyli zaraz po "O inwestycji".
--
-- NIE nadpisuje strony: wstawia tylko brakującą sekcję do aktualnej treści z bazy,
-- reszta (zmiany z /admin) zostaje bez zmian. Gdy sekcja Golf już jest — pomijana,
-- można uruchomić wielokrotnie. Jeśli na stronie nie ma sekcji Features, nic się nie dzieje.
--
-- {BR} w tekstach = złamanie wiersza na stronie (w panelu: nowa linia). Zamieniane na znak nowej linii przez
-- CHAR(92) — działa tak samo bez względu na tryb NO_BACKSLASH_ESCAPES serwera. COLLATE przy CHAR(92):
-- bez niego MySQL daje utf8mb4_bin i REPLACE kończy się błędem #1270 "Illegal mix of collations".
-- Komponent: src/components/investments/foxhills/Golf.tsx. Wymaga MySQL 5.7+ / MariaDB 10.2+.
-- =============================================================================

SET @nl = CONCAT(CHAR(92 USING utf8mb4) COLLATE utf8mb4_unicode_ci, 'n');

SET @golf = REPLACE('{"id":"golf","hashId":"golf","component":"Golf","type":"section","label":"Golf (Wyjątkowe miejsce. Wyjątkowa gra.)","fields":{"logo":{"value":"/investments/foxhills/golf/golf-krakow-valley-logo.webp","editable":true,"label":"Logo pola golfowego","type":"asset"},"logoAlt":{"value":"Golf Krakow Valley","editable":true,"label":"Logo — opis (alt)","type":"string"},"header":{"value":"WYJĄTKOWE MIEJSCE{BR}WYJĄTKOWA GRA.","editable":true,"label":"Nagłówek","type":"string"},"text":{"value":"Golf - rywalizacja w harmonii z naturą.{BR}Zwolnij tempo, podejmij wyzwanie i zagraj w zasięgu kilku kroków od własnego domu.","editable":true,"label":"Opis","type":"string"},"image":{"value":"/investments/foxhills/golf/golfista-zachod.webp","editable":true,"label":"Zdjęcie","type":"asset"},"imageAlt":{"value":"Golfista na polu golfowym o zachodzie słońca","editable":true,"label":"Opis zdjęcia (alt)","type":"string"},"familyHeader":{"value":"RODZINNE CHWILE{BR}W NAJLEPSZYM WYDANIU.","editable":true,"label":"Rodzinne chwile — nagłówek","type":"string"},"familyText":{"value":"Piękno przyrody, odpoczynek od codzienności, dobre towarzystwo i niezapomniane chwile.","editable":true,"label":"Rodzinne chwile — opis","type":"string"},"familyImage":{"value":"/investments/foxhills/golf/pilka-kij.webp","editable":true,"label":"Rodzinne chwile — zdjęcie","type":"asset"},"familyImageAlt":{"value":"Piłka i kij golfowy na murawie o zachodzie słońca","editable":true,"label":"Rodzinne chwile — opis zdjęcia (alt)","type":"string"},"photos":{"value":[{"image":"/investments/foxhills/golf/para-melex.webp","alt":"Para na polu golfowym przy wózku golfowym"},{"image":"/investments/foxhills/golf/akademia-dzieci.webp","alt":"Trening golfa dla dzieci"},{"image":"/investments/foxhills/golf/rodzina.webp","alt":"Rodzina z kijami golfowymi na polu"}],"editable":true,"label":"Mozaika zdjęć (1. duże, kolejne obok)","type":"table"},"generationsHeader":{"value":"SPORT KTÓRY ŁĄCZY POKOLENIA.","editable":true,"label":"Pokolenia — nagłówek","type":"string"},"generationsText":{"value":"Gwarancja wspaniale i aktywnie spędzonego czasu.","editable":true,"label":"Pokolenia — opis","type":"string"}}}',
  '{BR}', @nl);

-- "$.sections[3].component" -> 3; Golf wstawiany na to miejsce (Features przesuwa się dalej)
SET @idx = (SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Features', NULL, '$.sections[*].component')), '[', -1), ']', 1)
            FROM pages WHERE slug = '/inwestycja/foxhills');
UPDATE pages
SET content = JSON_ARRAY_INSERT(content, CONCAT('$.sections[', @idx, ']'), JSON_EXTRACT(@golf, '$'))
WHERE slug = '/inwestycja/foxhills'
  AND @idx IS NOT NULL
  AND JSON_SEARCH(content, 'one', 'Golf', NULL, '$.sections[*].component') IS NULL;

-- Kontrola: lista sekcji po migracji
SELECT JSON_EXTRACT(content, '$.sections[*].component') AS sections FROM pages WHERE slug = '/inwestycja/foxhills';
