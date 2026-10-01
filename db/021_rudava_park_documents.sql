-- =============================================================================
-- 021: Rudava Park — prospekt informacyjny i standard wykończenia
-- =============================================================================
-- Ustawia linki do PDF-ów (z API starej strony rudava-park.pl) w sekcji
-- Apartaments strony /inwestycja/rudava-park. Zmienia WYŁĄCZNIE
-- prospectusFile.value i standardFile.value; reszta strony (także zmiany z
-- panelu /admin) zostaje. Można uruchomić wielokrotnie.
-- Linki wskazują pliki na rudava-park.pl — do podmiany w panelu /admin.
-- =============================================================================

SET @sec = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Apartaments', NULL, '$.sections[*].component')), '.component', '')
            FROM pages WHERE slug = '/inwestycja/rudava-park');

UPDATE pages SET content = JSON_SET(content,
  CONCAT(@sec, '.fields.prospectusFile.value'), 'https://rudava-park.pl/admin/storage/uploads/2026/07/13/wzro-prospektu-informacyjnego-rudava-park_uid_6a54f7317d2cf.pdf',
  CONCAT(@sec, '.fields.standardFile.value'),   'https://rudava-park.pl/admin/storage/uploads/2026/04/22/standard-wykonczenia-rudava_uid_69e87ae55f5cd.pdf'
) WHERE slug = '/inwestycja/rudava-park' AND @sec IS NOT NULL;
