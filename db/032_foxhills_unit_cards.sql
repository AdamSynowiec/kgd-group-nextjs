-- =============================================================================
-- 032: Fox Hills — karta lokalu edytowana z wiersza tabeli lokali ("Więcej")
-- =============================================================================
-- Ustawia przy polu units sekcji Apartments (/inwestycja/foxhills) "details": "unitCard".
-- Panel /admin dokłada wtedy na końcu każdego wiersza tabeli lokali przycisk "Więcej",
-- który otwiera okno z kartą lokalu (src/components/admin/fields/RowDetailsDialog.tsx; konfiguracja okna: preset "unitCard" w rowDetails.ts):
--   - przyciski karty ("Parter", "Piętro", "Garaż" — nazwy dowolne, kolejność = kolejność
--     na stronie), każdy w tym samym układzie: zdjęcie/rzut, opis, tabela "pomieszczenie | m²",
--   - jeden prospekt informacyjny i jeden standard wykończenia (PDF) na lokal.
-- Dane trafiają do klucza "card" wiersza lokalu:
--   {"card": {"prospectusUrl": "", "standardUrl": "", "tabs": [{"label": "Parter", "image": "", "text": "",
--             "rooms": [{"name": "Salon", "area": "32"}]}]}}
--
-- Lokal bez własnej karty dalej pokazuje stare zakładki z unitViews (migracja 026);
-- okno "Więcej" ma przycisk "Wczytaj je do edycji". Pusty PDF lokalu = wspólny plik inwestycji.
--
-- Nie wymaga zmian w walidacji backendu ("card" mieści się w type "table"); upload PDF —
-- backend/src/Controller/UploadController.php. Można uruchomić wielokrotnie.
-- Komponent: src/components/investments/foxhills/Apartments.tsx. Wymaga MySQL 5.7+ / MariaDB 10.2+.
-- =============================================================================

-- "$.sections[3].component" -> "$.sections[3]"
SET @sec = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Apartments', NULL, '$.sections[*].component')), '.component', '')
            FROM pages WHERE slug = '/inwestycja/foxhills');

UPDATE pages
SET content = JSON_SET(content, CONCAT(@sec, '.fields.units.details'), 'unitCard')
WHERE slug = '/inwestycja/foxhills' AND @sec IS NOT NULL
  AND JSON_CONTAINS_PATH(content, 'one', CONCAT(@sec, '.fields.units.value'));

-- Podpisy starych / wspólnych pól, żeby było jasne, co zastępuje co.
UPDATE pages
SET content = JSON_SET(content,
  CONCAT(@sec, '.fields.unitViews.label'), 'STARE zakładki karty lokalu — zastąpione przyciskiem „Więcej” w tabeli lokali (używane tylko dla lokali bez własnej karty)',
  CONCAT(@sec, '.fields.standardUrl.label'), 'Standard wykończenia — wspólny PDF (gdy lokal nie ma własnego w karcie „Więcej”)'
)
WHERE slug = '/inwestycja/foxhills' AND @sec IS NOT NULL
  AND JSON_CONTAINS_PATH(content, 'all', CONCAT(@sec, '.fields.unitViews'), CONCAT(@sec, '.fields.standardUrl'));

-- Kontrola
SELECT JSON_EXTRACT(content, CONCAT(@sec, '.fields.units.details')) AS szczegoly_wiersza FROM pages WHERE slug = '/inwestycja/foxhills';
