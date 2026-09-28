-- =============================================================================
-- 019: Villa Verde Wola — zdjęcia, karty lokali, prospekt i standard
-- =============================================================================
--
-- Kopiuje 1:1 z API starej strony (villaverde-wola.pl):
--   A_ASSETS                -> images (parter i piętro każdej willi)
--   A_ROOM_PDF              -> pdfUrl (w źródle tylko WILLA III i WILLA IV)
--   A_INVESTMENT_PROSPECTUS -> Houses.prospectusFile
--   A_FINISH_STANDARD       -> Houses.standardFile
-- do strony /inwestycja/villaverde-wola. Linki nadal wskazują pliki na
-- villaverde-wola.pl/admin/storage/uploads — do podmiany w panelu.
--
-- Zmienia wyłącznie powyższe pola (lokale szukane po numerze "unit", sekcja
-- po nazwie komponentu), resztę treści — także zmiany z panelu — zostawia.
-- Można uruchomić wielokrotnie. Ten sam stan daje świeży import
-- db/inwestycje/villaverde-wola.sql.
-- =============================================================================

-- WILLA I
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'WILLA I', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/villaverde-wola');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://villaverde-wola.pl/admin/storage/uploads/2026/03/27/budynek-i-parter_uid_69c67759f01e5.png',
    'https://villaverde-wola.pl/admin/storage/uploads/2026/03/27/budynek-i-pietro_uid_69c6775d395b7.png'
  )
) WHERE slug = '/inwestycja/villaverde-wola' AND @path IS NOT NULL;

-- WILLA II
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'WILLA II', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/villaverde-wola');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://villaverde-wola.pl/admin/storage/uploads/2026/03/27/budynek-ii-parter_uid_69c6775a67e91.png',
    'https://villaverde-wola.pl/admin/storage/uploads/2026/03/27/budynek-ii-pietro_uid_69c6775b7ff7a.png'
  )
) WHERE slug = '/inwestycja/villaverde-wola' AND @path IS NOT NULL;

-- WILLA III
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'WILLA III', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/villaverde-wola');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://villaverde-wola.pl/admin/storage/uploads/2026/03/27/budynek-iii-parter_uid_69c6775aeb7b5.png',
    'https://villaverde-wola.pl/admin/storage/uploads/2026/03/27/budynek-iii-pietro_uid_69c6775dbfcc6.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://villaverde-wola.pl/admin/storage/uploads/2026/06/29/villa-verde-budynek-iii_uid_6a42e8bb9c987.pdf'
) WHERE slug = '/inwestycja/villaverde-wola' AND @path IS NOT NULL;

-- WILLA IV
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'WILLA IV', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/villaverde-wola');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://villaverde-wola.pl/admin/storage/uploads/2026/03/27/budynek-iv-parter_uid_69c6775e17253.png',
    'https://villaverde-wola.pl/admin/storage/uploads/2026/03/27/budynek-iv-pietro_uid_69c6775e8dff7.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://villaverde-wola.pl/admin/storage/uploads/2026/06/29/villa-verde-budynek-iv_uid_6a42e8bb92e8e.pdf'
) WHERE slug = '/inwestycja/villaverde-wola' AND @path IS NOT NULL;

-- WILLA V
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'WILLA V', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/villaverde-wola');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://villaverde-wola.pl/admin/storage/uploads/2026/03/27/budynek-v-parter_uid_69c6775f11641.png',
    'https://villaverde-wola.pl/admin/storage/uploads/2026/03/27/budynek-v-pietro_uid_69c6775f8e3c2.png'
  )
) WHERE slug = '/inwestycja/villaverde-wola' AND @path IS NOT NULL;

-- prospekt i standard wykończenia (sekcja Houses)
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Houses', NULL, '$.sections[*].component')), '.component', '.fields')
             FROM pages WHERE slug = '/inwestycja/villaverde-wola');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.prospectusFile.value'), 'https://villaverde-wola.pl/admin/storage/uploads/2026/06/15/villa-verde_uid_6a300ede5cf89.pdf',
  CONCAT(@path, '.standardFile.value'), 'https://villaverde-wola.pl/admin/storage/uploads/2025/11/12/standard-wykonczenia-villa-verde_uid_6914b6594de1d.pdf'
) WHERE slug = '/inwestycja/villaverde-wola' AND @path IS NOT NULL;
