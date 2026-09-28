-- =============================================================================
-- 016: Morelife Apartments — stan oferty zgodny z produkcją (kgd-group.pl)
-- =============================================================================
--
-- Produkcja (2026-09-28) oferuje już tylko M 11-2, M 13-2, MP 11-2, MP 13-2.
-- Pozostałe lokale z naszej tabeli (M 11-1, M 12-1, M 15-2 i ich miejsca
-- postojowe) dostają status "Sprzedany", a z ustawowego rejestru cen
-- (historia-cen) znikają wiersze M 15-2 i MP 15-2 — rejestr obejmuje tylko
-- lokale w ofercie. Przy okazji poprawka formy prawnej w rejestrze
-- ("SPÓKA" -> "SPÓŁKA").
--
-- Zmienia wyłącznie powyższe; lokale szukane po numerze, nie po pozycji.
-- Można uruchomić wielokrotnie. Ten sam stan daje świeży import
-- db/inwestycje/morelife-apartments.sql.
-- =============================================================================

-- M 11-1: Sprzedany
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 11-1', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '.status')
             FROM pages WHERE slug = '/inwestycja/morelife-apartments');
UPDATE pages SET content = JSON_SET(content, @path, 'Sprzedany')
WHERE slug = '/inwestycja/morelife-apartments' AND @path IS NOT NULL;

-- MP 11-1: Sprzedany
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MP 11-1', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '.status')
             FROM pages WHERE slug = '/inwestycja/morelife-apartments');
UPDATE pages SET content = JSON_SET(content, @path, 'Sprzedany')
WHERE slug = '/inwestycja/morelife-apartments' AND @path IS NOT NULL;

-- M 12-1: Sprzedany
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 12-1', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '.status')
             FROM pages WHERE slug = '/inwestycja/morelife-apartments');
UPDATE pages SET content = JSON_SET(content, @path, 'Sprzedany')
WHERE slug = '/inwestycja/morelife-apartments' AND @path IS NOT NULL;

-- MP 12-1: Sprzedany
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MP 12-1', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '.status')
             FROM pages WHERE slug = '/inwestycja/morelife-apartments');
UPDATE pages SET content = JSON_SET(content, @path, 'Sprzedany')
WHERE slug = '/inwestycja/morelife-apartments' AND @path IS NOT NULL;

-- M 15-2: Sprzedany
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 15-2', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '.status')
             FROM pages WHERE slug = '/inwestycja/morelife-apartments');
UPDATE pages SET content = JSON_SET(content, @path, 'Sprzedany')
WHERE slug = '/inwestycja/morelife-apartments' AND @path IS NOT NULL;

-- MP 15-2: Sprzedany
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MP 15-2', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '.status')
             FROM pages WHERE slug = '/inwestycja/morelife-apartments');
UPDATE pages SET content = JSON_SET(content, @path, 'Sprzedany')
WHERE slug = '/inwestycja/morelife-apartments' AND @path IS NOT NULL;

-- rejestr cen: usuń M 15-2
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 15-2', NULL, '$.sections[*].fields.rows.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/morelife-apartments/historia-cen');
UPDATE pages SET content = JSON_REMOVE(content, @path)
WHERE slug = '/inwestycja/morelife-apartments/historia-cen' AND @path IS NOT NULL;

-- rejestr cen: usuń MP 15-2
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MP 15-2', NULL, '$.sections[*].fields.rows.value[*].partLabel')), '.partLabel', '')
             FROM pages WHERE slug = '/inwestycja/morelife-apartments/historia-cen');
UPDATE pages SET content = JSON_REMOVE(content, @path)
WHERE slug = '/inwestycja/morelife-apartments/historia-cen' AND @path IS NOT NULL;

-- rejestr cen: forma prawna
UPDATE pages SET content = REPLACE(content, 'SPÓKA Z OGRANICZONĄ', 'SPÓŁKA Z OGRANICZONĄ')
WHERE slug = '/inwestycja/morelife-apartments/historia-cen';
