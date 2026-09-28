-- =============================================================================
-- 018: Pylna Residence — zdjęcia, karty lokali, prospekt i standard
-- =============================================================================
--
-- Kopiuje 1:1 z API starej strony (pylnaresidence.pl):
--   A_ASSETS                -> images (wszystkie 16 pozycji: parter, piętro,
--                              miejsce dodatkowe / miejsce postojowe)
--   A_ROOM_PDF              -> pdfUrl (w źródle tylko M 3, M 4, M 5 i ich
--                              miejsca postojowe)
--   A_INVESTMENT_PROSPECTUS -> Offert.prospectusFile
--   A_FINISH_STANDARD       -> Offert.standardFile
-- do strony /inwestycja/pylnaresidence. Linki nadal wskazują pliki na
-- pylnaresidence.pl/admin/storage/uploads — do podmiany w panelu.
--
-- Zmienia wyłącznie powyższe pola (lokale szukane po numerze "unit", sekcja
-- po nazwie komponentu), resztę treści — także zmiany z panelu — zostawia.
-- Można uruchomić wielokrotnie. Ten sam stan daje świeży import
-- db/inwestycje/pylna-residence.sql.
-- =============================================================================

-- M 1
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 1', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/10/m1-parter_uid_693a07bd63a5e.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2026/01/30/m1-pietro_uid_697d01b9ef7e5.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-dodatkowe-1_uid_693ae485e7dc7.png'
  )
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- M 2
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 2', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/10/m2-parter_uid_693a07bc8d1e3.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2026/01/30/m2-pietro_uid_697d01b9e5080.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-dodatkowe-2_uid_693ae48584e7d.png'
  )
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- M 3
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 3', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/10/m3-parter_uid_693a07be3a6b1.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2026/01/30/m3-pietro_uid_697d01b9b8d25.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-dodatkowe-3_uid_693ae485bab27.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://pylnaresidence.pl/admin/storage/uploads/2026/06/29/pylna-residence-m3_uid_6a42e56040ed9.pdf'
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- M 4
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 4', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/10/m4-parter_uid_693a07c134dc1.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2026/01/30/m4-pietro_uid_697d01b854d8e.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-dodatkowe-4_uid_693ae48663d69.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://pylnaresidence.pl/admin/storage/uploads/2026/06/29/pylna-residence-m4_uid_6a42e55e84bc0.pdf'
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- M 5
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 5', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/10/m5-parter_uid_693a07c1e2024.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2026/01/30/m5-pietro_uid_697d01b85598e.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-dodatkowe-5_uid_693ae486255ab.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://pylnaresidence.pl/admin/storage/uploads/2026/06/29/pylna-residence-m5_uid_6a42e55ee2bf2.pdf'
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- M 6
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 6', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/10/m6-parter_uid_693a07c4d9158.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2026/01/30/m6-pietro_uid_697d01b840eac.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-dodatkowe-6_uid_693ae4877eb88.png'
  )
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- M 7
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 7', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/10/m7-parter_uid_693a07c572355.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2026/01/30/m7-pietro_uid_697d01b83ef70.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-dodatkowe-7_uid_693ae487b72b8.png'
  )
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- M 8
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 8', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/10/m8-parter_uid_693a07c626705.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2026/01/30/m8-pietro_uid_697d01b822da1.png',
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-dodatkowe-8_uid_693ae48837538.png'
  )
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- Miejsce Parkingowe 1
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Miejsce Parkingowe 1', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-postojowe-1_uid_693ae4884fa61.png'
  )
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- Miejsce Parkingowe 2
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Miejsce Parkingowe 2', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-postojowe-2_uid_693ae488ccd84.png'
  )
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- Miejsce Parkingowe 3
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Miejsce Parkingowe 3', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-postojowe-3_uid_693ae4897280d.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://pylnaresidence.pl/admin/storage/uploads/2026/06/29/miejsce-postojowe-3_uid_6a42e55ea7035.pdf'
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- Miejsce Parkingowe 4
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Miejsce Parkingowe 4', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-postojowe-4_uid_693ae489ddf63.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://pylnaresidence.pl/admin/storage/uploads/2026/06/29/miejsce-postojowe-4_uid_6a42e55e77c21.pdf'
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- Miejsce Parkingowe 5
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Miejsce Parkingowe 5', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-postojowe-5_uid_693ae48a45b0d.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://pylnaresidence.pl/admin/storage/uploads/2026/06/29/miejsce-postojowe-5_uid_6a42e55eb2418.pdf'
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- Miejsce Parkingowe 6
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Miejsce Parkingowe 6', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-postojowe-6_uid_693ae48a7cb08.png'
  )
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- Miejsce Parkingowe 7
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Miejsce Parkingowe 7', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-postojowe-7_uid_693ae48aeddad.png'
  )
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- Miejsce Parkingowe 8
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Miejsce Parkingowe 8', NULL, '$.sections[*].fields.houses.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://pylnaresidence.pl/admin/storage/uploads/2025/12/11/miejsce-postojowe-8_uid_693ae48b28e67.png'
  )
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;

-- prospekt i standard wykończenia (sekcja Offert)
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Offert', NULL, '$.sections[*].component')), '.component', '.fields')
             FROM pages WHERE slug = '/inwestycja/pylnaresidence');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.prospectusFile.value'), 'https://pylnaresidence.pl/admin/storage/uploads/2026/01/04/wzor-prospekt-informacyjny-pylna-residence-ogolny-na-www_uid_695aa6e583e32.pdf',
  CONCAT(@path, '.standardFile.value'), 'https://pylnaresidence.pl/admin/storage/uploads/2025/12/30/standard-wykonczenia-8_uid_6953d8e989acc.pdf'
) WHERE slug = '/inwestycja/pylnaresidence' AND @path IS NOT NULL;
