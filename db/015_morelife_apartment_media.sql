-- =============================================================================
-- 015: Morelife Apartments — zdjęcia, karty lokali i dokumenty w tabeli oferty
-- =============================================================================
--
-- Kopiuje 1:1 z API starej strony (kgd-group.pl, kolekcja
-- "apartamentsmorelifeapartments") do pola Offert.apartments strony
-- /inwestycja/morelife-apartments:
--   A_ASSETS                  -> images (same adresy — edytowalne w panelu)
--   PDF                       -> pdfUrl (karta lokalu)
--   A_INVESTMENT_PROSPECTUS   -> prospectusUrl (tylko mieszkania; miejsca
--                                postojowe nie mają prospektu w źródle)
--   A_FINISH_STANDARD         -> finishStandardUrl (ten sam plik dla wszystkich)
-- Linki nadal wskazują pliki na kgd-group.pl/admin/storage/uploads — do
-- podmiany w panelu /admin (tabela "apartments" sekcji Offert).
--
-- Źródło zwraca tylko 4 pozycje (M 11-2, M 13-2, MP 11-2, MP 13-2); pozostałe
-- wiersze tabeli (M 11-1, M 12-1, M 15-2 i ich MP) nie są ruszane.
--
-- Zmienia WYŁĄCZNIE powyższe pola wskazanych lokali (szukanych po numerze
-- "unit", nie po pozycji), resztę treści — także zmiany z panelu — zostawia.
-- Lokal, którego nie ma w tabeli, jest pomijany. Można uruchomić wielokrotnie.
-- Ten sam stan daje świeży import db/inwestycje/morelife-apartments.sql.
-- =============================================================================

-- M 11-2
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 11-2', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/morelife-apartments');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/m11-b_uid_6a33b599cbe10.png',
    'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/md-11b_uid_6a33b599be3fd.jpg'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/m11-b_uid_6a33f7adb0184.pdf',
  CONCAT(@path, '.prospectusUrl'), 'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/prospekt-budynki-m9-m12-1_uid_6a33c60b02b56.pdf',
  CONCAT(@path, '.finishStandardUrl'), 'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/morelife-standard-wykonczenia_uid_6a33b1c49afd7.pdf'
) WHERE slug = '/inwestycja/morelife-apartments' AND @path IS NOT NULL;

-- M 13-2
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'M 13-2', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/morelife-apartments');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/m13-b_uid_6a33b79a88dcb.png',
    'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/md-13-b_uid_6a33b79abba8d.png'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/m13-b_uid_6a33f879e2afa.pdf',
  CONCAT(@path, '.prospectusUrl'), 'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/prospekt-budynki-m13-m16-1_uid_6a33c60aee724.pdf',
  CONCAT(@path, '.finishStandardUrl'), 'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/morelife-standard-wykonczenia_uid_6a33b1c49afd7.pdf'
) WHERE slug = '/inwestycja/morelife-apartments' AND @path IS NOT NULL;

-- MP 11-2
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MP 11-2', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/morelife-apartments');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/mp-11b_uid_6a33b9a2dba78.jpg'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/mp-11b_uid_6a33f9e0022a0.pdf',
  CONCAT(@path, '.finishStandardUrl'), 'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/morelife-standard-wykonczenia_uid_6a33b1c49afd7.pdf'
) WHERE slug = '/inwestycja/morelife-apartments' AND @path IS NOT NULL;

-- MP 13-2
SET @path = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'MP 13-2', NULL, '$.sections[*].fields.apartments.value[*].unit')), '.unit', '')
             FROM pages WHERE slug = '/inwestycja/morelife-apartments');
UPDATE pages SET content = JSON_SET(content,
  CONCAT(@path, '.images'), JSON_ARRAY(
    'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/mp-13b_uid_6a33b9a2be399.jpg'
  ),
  CONCAT(@path, '.pdfUrl'), 'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/mp-13b_uid_6a33f7adb3b16.pdf',
  CONCAT(@path, '.finishStandardUrl'), 'https://kgd-group.pl/OLD/admin/storage/uploads/2026/06/18/morelife-standard-wykonczenia_uid_6a33b1c49afd7.pdf'
) WHERE slug = '/inwestycja/morelife-apartments' AND @path IS NOT NULL;
