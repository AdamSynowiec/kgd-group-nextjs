-- =============================================================================
-- 014: Rudava Park — zdjęcia i karty lokali w tabeli mieszkań
-- =============================================================================
--
-- Kopiuje 1:1 z API starej strony (rudava-park.pl, kolekcja "apartments":
-- A_ASSETS -> images, A_ROOM_PDF -> pdfUrl) do pola Apartaments.apartments
-- strony /inwestycja/rudava-park. Linki nadal wskazują pliki na
-- rudava-park.pl/admin/storage/uploads — do podmiany w panelu /admin
-- (kolumny "images" i "pdfUrl" w tabeli mieszkań).
--
-- Dla ISTNIEJĄCEJ bazy: ponowne wgranie db/inwestycje/rudava-park.sql
-- nadpisałoby całą stronę (także zmiany z panelu), a ta migracja zmienia
-- WYŁĄCZNIE images/pdfUrl wskazanych lokali. Lokal jest szukany po numerze
-- ("unit"), nie po pozycji w tabeli, więc kolejność wierszy nie ma znaczenia;
-- lokal, którego nie ma w tabeli, jest pomijany. Można uruchomić wielokrotnie.
-- M4A, M5A, M6A, M7A nie mają karty lokalu w źródle — dostają tylko zdjęcia.
--
-- Wymaga MySQL 5.7+ / MariaDB 10.2+ (JSON_SEARCH/JSON_SET).
-- =============================================================================

-- M1A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M1A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/06/26/apartament-m1a_uid_6a3e649664473.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/07/30/m1-a-md_uid_6a6b244e0015a.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://rudava-park.pl/admin/storage/uploads/2026/07/30/rudava-park-m1-a_uid_6a6b244e1e4a2.pdf'
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;

-- M3B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M3B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m3-b-p0_uid_6a96041986421.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m3-b-p1_uid_6a960419931d4.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m1b-p2_uid_6a96041974ef1.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m3-b-md_uid_6a96041990553.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://rudava-park.pl/admin/storage/uploads/2026/08/31/karta-lokalu-m3b_uid_6a96047a74c1b.pdf'
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;

-- M2A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M2A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/02/11/apartament-m2a_uid_698c53af03ee7.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/02/15/m2-a-md_uid_6991e15229682.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://rudava-park.pl/admin/storage/uploads/2026/04/30/karty-lokali-m2a_uid_69f357c518b1a.pdf'
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;

-- M2B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M2B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/apartament-m2b-p0_uid_6a96034fbefe4.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/apartament-m2b-p1_uid_6a96034fc73d3.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/apartament-m2b-p2_uid_6a96034fb8686.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m2-b-md_uid_6a96034fbe325.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://rudava-park.pl/admin/storage/uploads/2026/08/31/karta-lokalu-m2b_uid_6a96035049cf7.pdf'
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;

-- M3A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M3A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/06/26/apartament-m3a_uid_6a3e668af1a62.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/06/26/2_uid_6a3e668af1e33.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://rudava-park.pl/admin/storage/uploads/2026/06/26/m3-a_uid_6a3e66a8a7942.pdf'
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;

-- M1B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M1B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/apartament-m1b-p0_uid_6a9601d8afb3c.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/apartament-m1b-p1_uid_6a9601d89ded3.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/apartament-m1b-p2_uid_6a9601d8ae855.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/4_uid_6a9601d8af364.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://rudava-park.pl/admin/storage/uploads/2026/08/31/karta-lokalu-m1b_uid_6a960296826a0.pdf'
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;

-- M4A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M4A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/02/11/apartament-m4a_uid_698c5fdaef171.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/02/15/m4-a-md_uid_6991e15579be6.png'
  )
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;

-- M4B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M4B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m4-b-p0_uid_6a9606cabbe08.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m4-b-p1_uid_6a9606ca93706.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m4-b-p2_uid_6a9606cad420f.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m4-b-md_uid_6a9606cad516d.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://rudava-park.pl/admin/storage/uploads/2026/08/31/karta-lokali-m4b_uid_6a9606edcc42d.pdf'
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;

-- M5A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M5A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/02/11/apartament-m5a_uid_698c5ff4d906e.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/02/15/m5-a-md_uid_6991e15601338.png'
  )
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;

-- M5B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M5B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m5-b-p0_uid_6a9607cf08d6e.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m5-b-p1_uid_6a9607cf0d025.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m5b-p2_uid_6a9607cf0e6df.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m5-b-md_uid_6a9607cf0d7ed.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://rudava-park.pl/admin/storage/uploads/2026/08/31/karta-lokalu-m5b_uid_6a9607f8e8f5d.pdf'
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;

-- M6A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M6A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/02/11/apartament-m6a_uid_698c5ff4d87ea.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/02/15/m6-a-md_uid_6991e15633593.png'
  )
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;

-- M6B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M6B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m6b-p0_uid_6a9608d8757c9.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m6b-p1_uid_6a9608d877cc4.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m6b-p2_uid_6a9608d85340d.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/08/31/m6-b-md_uid_6a9608d876f5c.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://rudava-park.pl/admin/storage/uploads/2026/08/31/karta-lokalu-m6b_uid_6a960920049dc.pdf'
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;

-- M7A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M7A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/rudava-park');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://rudava-park.pl/admin/storage/uploads/2026/03/31/apartament-m7a_uid_69cbcef7997ea.png',
    'https://rudava-park.pl/admin/storage/uploads/2026/02/15/m7-a-md_uid_6991e158be826.png'
  )
) WHERE slug = '/inwestycja/rudava-park' AND @path IS NOT NULL;
