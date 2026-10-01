-- =============================================================================
-- 023: KRJ307-2 — standard wykończenia i prospekty (PDF)
-- =============================================================================
-- Ustawia linki do PDF-ów (ze starej strony krj307-2.pl) w sekcji Cta strony
-- /inwestycja/krj307-2: standardPdfUrl oraz przyciski prospektu (budynki M1-M4
-- i M5-M8). Reszta strony zostaje bez zmian. Można uruchomić wielokrotnie.
-- Linki wskazują pliki na krj307-2.pl — do podmiany w panelu /admin.
-- =============================================================================

SET @sec = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Cta', NULL, '$.sections[*].component')), '.component', '')
            FROM pages WHERE slug = '/inwestycja/krj307-2');

UPDATE pages SET content = JSON_SET(content,
  CONCAT(@sec, '.fields.standardPdfUrl.value'), 'https://krj307-2.pl/upload/Standard%20wyko%C5%84czenia%20KRJ307-2.pdf',
  CONCAT(@sec, '.fields.prospectusButtons.value'), JSON_ARRAY(
    JSON_OBJECT('label', 'Budynek m1 do m4', 'url', 'https://krj307-2.pl/upload/Prospekt-KRJ-3%20-BUDYNKI%20M1-M4.pdf'),
    JSON_OBJECT('label', 'Budynek m5 do m8', 'url', 'https://krj307-2.pl/upload/Prospekt-KRJ-3%20-BUDYNKI%20M5-M8.pdf')
  )
) WHERE slug = '/inwestycja/krj307-2' AND @sec IS NOT NULL;
