-- =============================================================================
-- 024: KRJ307-2 — zdjęcia (rzuty) i karty lokali w tabeli apartamentów
-- =============================================================================
-- Kopiuje 1:1 z API starej strony (krj307-2.pl, kolekcja treekrjapartments:
-- krj_apartmentPlan -> images, A_ROOM_PDF -> pdfUrl) do pola
-- Apartaments.apartments strony /inwestycja/krj307-2. Linki wskazują pliki na
-- krj307-2.pl/acp/storage/uploads — do podmiany w panelu /admin.
-- Zmienia WYŁĄCZNIE images/pdfUrl wskazanych lokali (szukanych po "unit").
-- M7 A: poprawia też cenę zapisaną w źródle bez spacji ("1040195").
-- Można uruchomić wielokrotnie. Wymaga MySQL 5.7+ / MariaDB 10.2+.
-- =============================================================================

-- M1 A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M1 A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m1-a_uid_691674ac803c6.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m1-a-md_uid_6916748ec47ba.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 1
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 1', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-1_uid_691671e3cfa34.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M1 B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M1 B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m1-b-p0_uid_6a0264506d024.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m1-b-p1_uid_6a026450b2eaf.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m1-b-p2_uid_6a026450b8e6e.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m1-b-md_uid_6916748ec856f.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 2
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 2', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-2_uid_691671e3e2e37.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M2 A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M2 A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m2-a_uid_691674c1f0150.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m2-a-md_uid_6916748ee4d1a.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 3
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 3', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-3_uid_691671e3e3f84.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M2 B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M2 B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m2-b-p0_uid_6a02646a52e5d.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m2-b-p1_uid_6a02646a6fa3f.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m2-b-p2_uid_6a02646a89960.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m2-b-md_uid_6916748ee38fb.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://krj307-2.pl/acp/storage/uploads/2026/07/01/m2-b_uid_6a450820cb1c0.pdf'
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 4
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 4', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-4_uid_691671e407f0b.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://krj307-2.pl/acp/storage/uploads/2026/07/01/m2-b-mp_uid_6a4508c223061.pdf'
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M3 A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M3 A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m3-a_uid_691676203a2ce.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m3-a-md_uid_6916748ee3fdf.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 5
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 5', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-5_uid_691671e407208.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M3 B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M3 B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m3-b-p0_uid_6a02647d3cd50.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m3-b-p1_uid_6a02647d4fa96.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m3-b-p2_uid_6a02647d70dd8.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m3-b-md_uid_69167493471c1.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://krj307-2.pl/acp/storage/uploads/2026/07/01/m3-b_uid_6a450fa8d9a41.pdf'
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 6
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 6', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-6_uid_691671e84e840.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://krj307-2.pl/acp/storage/uploads/2026/07/01/miejsce-postojowe-6-m3b_uid_6a450fa81679c.pdf'
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M4 A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M4 A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m4-a_uid_6916763522e5b.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m4-a-md_uid_69167493890dc.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 7
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 7', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-7_uid_691671e881560.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M4 B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M4 B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m4-b-p0_uid_6a0264938d44d.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m4-b-p1_uid_6a026493bbff8.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m4-b-p2_uid_6a026493a4332.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m4-b-md_uid_691674939bba7.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://krj307-2.pl/acp/storage/uploads/2026/07/01/m4-b_uid_6a4510715718c.pdf'
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 8
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 8', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-8_uid_691671e867605.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://krj307-2.pl/acp/storage/uploads/2026/07/01/miejsce-postojowe-m4-b_uid_6a45107108073.pdf'
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M5 A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M5 A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2026/02/09/m5-a_uid_6989ed10492b4.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m5-a-md_uid_69167493b2802.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 9
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 9', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-9_uid_691671eca1e3d.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M5 B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M5 B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m5-b-p1_uid_6a0264b39549e.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m5-b-p2_uid_6a0264b3aeec3.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m5-b-p0_uid_6a0264b2cd5be.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m5-b-md_uid_69167493b313a.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://krj307-2.pl/acp/storage/uploads/2026/07/01/m5-b_uid_6a45116311c2b.pdf'
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 10
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 10', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-10_uid_691671eeeca24.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://krj307-2.pl/acp/storage/uploads/2026/07/01/miejsce-postojowe-10-m5-b_uid_6a451162a29f9.pdf'
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M6 A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M6 A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2026/02/09/m6-a_uid_6989f017e64e4.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m6-a-md_uid_691674948000a.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 11
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 11', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-11_uid_691671ef48e5c.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M6 B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M6 B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m6b-p0_uid_6a0264c395c24.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m6-b-p1_uid_6a0264c4079a0.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m6-b-p2_uid_6a0264c3e57d8.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m6-b-md_uid_69167496abacb.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://krj307-2.pl/acp/storage/uploads/2026/07/01/m6-b_uid_6a4511fba296c.pdf'
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 12
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 12', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-12_uid_691671ef69962.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://krj307-2.pl/acp/storage/uploads/2026/07/01/miejsce-postojowe-m6-b_uid_6a4512a113dff.pdf'
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M7 A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M7 A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2026/02/09/m7-a_uid_6989f1c8cbc21.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m7-a-md_uid_69167497c841f.png'
  ),
  CONCAT(@path, '.pdfUrl'), '',
  CONCAT(@path, '.price'), '1 040 195'
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 13
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 13', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-13_uid_691671ef69c89.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M7 B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M7 B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m7-b-p0_uid_6a0264dd4058d.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m7-b-p1_uid_6a0264dda65a0.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m7-b-p2_uid_6a0264dd6f5d6.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m7-b-md-1_uid_6a02686d70a53.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 14
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 14', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-14_uid_691671efcd5d7.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M8 A
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M8 A', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2026/02/09/m8-a_uid_6989f1b0ead25.png',
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/m8-a-md_uid_69167497e4475.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 15
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 15', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-15_uid_691671e881344.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- M8 B
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M8 B', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m8-b-p0_uid_6a0264ebd9489.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m8-b-p1_uid_6a0264ec1947a.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m8-b-p2_uid_6a0264ec34496.png',
    'https://krj307-2.pl/acp/storage/uploads/2026/05/11/m8-b-md_uid_6a0268f26119c.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;

-- MIEJSCE POSTOJOWE 16
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MIEJSCE POSTOJOWE 16', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/krj307-2');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://krj307-2.pl/acp/storage/uploads/2025/11/14/mp-16_uid_691671e881f4f.png'
  ),
  CONCAT(@path, '.pdfUrl'), ''
) WHERE slug = '/inwestycja/krj307-2' AND @path IS NOT NULL;
