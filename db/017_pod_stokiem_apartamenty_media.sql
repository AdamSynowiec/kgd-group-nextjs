-- =============================================================================
-- 017: Apartamenty Pod Stokiem — zdjęcia, karty lokali, prospekt i standard
-- =============================================================================
--
-- Kopiuje 1:1 z API starej strony (apartamenty-podstokiem.pl):
--   A_ASSETS                -> images (każdy lokal i miejsce postojowe)
--   A_ROOM_PDF              -> pdfUrl (karta lokalu)
--   A_INVESTMENT_PROSPECTUS -> Apartaments.prospectusFile
--   A_FINISH_STANDARD       -> Apartaments.standardFile
-- do strony /inwestycja/apartamenty-podstokiem. Linki nadal wskazują pliki na
-- apartamenty-podstokiem.pl/admin/storage/uploads — do podmiany w panelu.
--
-- Uwaga: w źródle "Miejsca Parkingowe M1B" ma przypiętą tę samą kartę co
-- "Miejsca Parkingowe M2B" (miejsce-postojowe-m2b...pdf) — skopiowane 1:1.
--
-- Zmienia wyłącznie powyższe pola (lokale szukane po numerze "unit", sekcja
-- po nazwie komponentu), resztę treści — także zmiany z panelu — zostawia.
-- Można uruchomić wielokrotnie. Ten sam stan daje świeży import
-- db/inwestycje/pod-stokiem-apartamenty.sql.
-- =============================================================================

-- M1A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M1A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/apartamenty-podstokiem');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/01/13/apartament-m1a_uid_696667582361b.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/06/29/apartament-m1a_uid_6a42d9f6da01e.pdf'
) WHERE slug = '/inwestycja/apartamenty-podstokiem' AND @path IS NOT NULL;

-- Miejsca Parkingowe M1A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Miejsca Parkingowe M1A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/apartamenty-podstokiem');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/01/14/miejsce-postojowe-1_uid_6967d8ee24224.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/06/29/miejsce-postojowe-m1a_uid_6a42d9f1ea07f.pdf'
) WHERE slug = '/inwestycja/apartamenty-podstokiem' AND @path IS NOT NULL;

-- M1B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M1B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/apartamenty-podstokiem');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/01/13/apartament-m1b-1_uid_696667580c5f0.png',
    'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/01/13/apartament-m1b-2_uid_69666758391b7.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/06/29/apartament-m1b_uid_6a42d9f7c2c41.pdf'
) WHERE slug = '/inwestycja/apartamenty-podstokiem' AND @path IS NOT NULL;

-- Miejsca Parkingowe M1B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Miejsca Parkingowe M1B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/apartamenty-podstokiem');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/01/14/miejsce-postojowe-2_uid_6967d8edec171.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/06/29/miejsce-postojowe-m2b_uid_6a42d9f205d56.pdf'
) WHERE slug = '/inwestycja/apartamenty-podstokiem' AND @path IS NOT NULL;

-- M2A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M2A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/apartamenty-podstokiem');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/01/13/apartament-m2a_uid_696667583b477.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/06/29/apartament-m2a_uid_6a42d9f67e2c0.pdf'
) WHERE slug = '/inwestycja/apartamenty-podstokiem' AND @path IS NOT NULL;

-- Miejsca Parkingowe M2A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Miejsca Parkingowe M2A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/apartamenty-podstokiem');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/01/14/miejsce-postojowe-4_uid_6967d8ee2176e.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/06/29/miejsce-postojowe-m2a_uid_6a42d9f1b99c2.pdf'
) WHERE slug = '/inwestycja/apartamenty-podstokiem' AND @path IS NOT NULL;

-- M2B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M2B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/apartamenty-podstokiem');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/01/13/apartament-m2b-1_uid_6966675821311.png',
    'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/01/13/apartament-m2b-2_uid_69666759662b0.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/06/29/apartamenty-m2b_uid_6a42d9f6c789f.pdf'
) WHERE slug = '/inwestycja/apartamenty-podstokiem' AND @path IS NOT NULL;

-- Miejsca Parkingowe M2B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Miejsca Parkingowe M2B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/apartamenty-podstokiem');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/01/14/miejsce-postojowe-3_uid_6967d8ee24435.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/06/29/miejsce-postojowe-m2b_uid_6a42d9f205d56.pdf'
) WHERE slug = '/inwestycja/apartamenty-podstokiem' AND @path IS NOT NULL;

-- prospekt i standard wykończenia (sekcja Apartaments)
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Apartaments', NULL, '$.sections[*].component')), '.component', '.fields')
             FROM pages WHERE slug = '/inwestycja/apartamenty-podstokiem');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.prospectusFile.value'), 'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/01/14/prospekt-pod-stokiem-apartamenty_uid_6967d4673b24f.pdf',
  CONCAT(@path, '.standardFile.value'), 'https://apartamenty-podstokiem.pl/admin/storage/uploads/2026/01/17/standard-wykonczenia-pod-stokiem-20-1_uid_696b665cc2427.pdf'
) WHERE slug = '/inwestycja/apartamenty-podstokiem' AND @path IS NOT NULL;
