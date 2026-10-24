-- =============================================================================
-- 030: Fox Hills — nowe kafelki w sekcji Udogodnienia (Features)
-- =============================================================================
-- Kafelki z katalogu "FOX HILLS RESIDENCES" (str. 11), teksty 1:1 z katalogu:
--   STAJNIA LOVARDA      — W siodle, bliżej natury.
--   SZLAK ORLICH GNIAZD  — Odkrywaj Jurę bez pośpiechu.
--   WSPINACZKA NA JURZE  — Aktywność z widokiem.
--   NARCIARSTWO BIEGOWE  — Aktywnie również zimą.
-- Zdjęcia: public/investments/foxhills/amenities/*.webp (wycięte z katalogu).
--
-- Każdy kafelek dopisywany jest NA KONIEC listy i TYLKO gdy kafelka o tym tytule
-- jeszcze nie ma (bez względu na wielkość liter) — nie zmienia istniejących kafelków,
-- ich kolejności ani tekstów. Można uruchomić wielokrotnie.
-- Komponent: src/components/investments/foxhills/Features.tsx. Wymaga MySQL 5.7+ / MariaDB 10.2+.
-- =============================================================================


-- "$.sections[2].component" -> "$.sections[2].fields.items.value"
SET @items = (SELECT CONCAT(REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Features', NULL, '$.sections[*].component')), '.component', ''), '.fields.items.value')
              FROM pages WHERE slug = '/inwestycja/foxhills');

UPDATE pages
SET content = JSON_ARRAY_APPEND(content, @items, JSON_OBJECT('title', 'STAJNIA LOVARDA', 'text', 'W siodle, bliżej natury.', 'image', '/investments/foxhills/amenities/stajnia-lovarda-jura.webp'))
WHERE slug = '/inwestycja/foxhills' AND @items IS NOT NULL
  AND JSON_SEARCH(LOWER(JSON_EXTRACT(content, CONCAT(@items, '[*].title'))), 'one', 'stajnia lovarda') IS NULL;

UPDATE pages
SET content = JSON_ARRAY_APPEND(content, @items, JSON_OBJECT('title', 'SZLAK ORLICH GNIAZD', 'text', 'Odkrywaj Jurę bez pośpiechu.', 'image', '/investments/foxhills/amenities/szlak-orlich-gniazd.webp'))
WHERE slug = '/inwestycja/foxhills' AND @items IS NOT NULL
  AND JSON_SEARCH(LOWER(JSON_EXTRACT(content, CONCAT(@items, '[*].title'))), 'one', 'szlak orlich gniazd') IS NULL;

UPDATE pages
SET content = JSON_ARRAY_APPEND(content, @items, JSON_OBJECT('title', 'WSPINACZKA NA JURZE', 'text', 'Aktywność z widokiem.', 'image', '/investments/foxhills/amenities/wspinaczka-na-jurze.webp'))
WHERE slug = '/inwestycja/foxhills' AND @items IS NOT NULL
  AND JSON_SEARCH(LOWER(JSON_EXTRACT(content, CONCAT(@items, '[*].title'))), 'one', 'wspinaczka na jurze') IS NULL;

UPDATE pages
SET content = JSON_ARRAY_APPEND(content, @items, JSON_OBJECT('title', 'NARCIARSTWO BIEGOWE', 'text', 'Aktywnie również zimą.', 'image', '/investments/foxhills/amenities/narciarstwo-biegowe.webp'))
WHERE slug = '/inwestycja/foxhills' AND @items IS NOT NULL
  AND JSON_SEARCH(LOWER(JSON_EXTRACT(content, CONCAT(@items, '[*].title'))), 'one', 'narciarstwo biegowe') IS NULL;

-- Kontrola
SELECT JSON_EXTRACT(content, CONCAT(@items, '[*].title')) AS kafelki FROM pages WHERE slug = '/inwestycja/foxhills';
