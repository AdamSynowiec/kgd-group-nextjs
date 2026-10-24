-- =============================================================================
-- 026: Fox Hills — zakładki w karcie lokalu (Podsumowanie / Parter / Piętro ...)
-- =============================================================================
-- Dodaje do sekcji Apartments strony /inwestycja/foxhills dwa pola:
--   summaryLabel — podpis pierwszego przycisku (strona tytułowa karty),
--   unitViews    — tabela zakładek: jeden wiersz = jeden przycisk w karcie lokalu,
--                  który podmienia zdjęcie i opis.
--
-- Kolumny unitViews:
--   unit  — numer lokalu (np. I.W.11): wiersz tylko dla tego lokalu,
--   type  — typ (Willa / Bliźniak / Apartament): wiersz dla wszystkich lokali tego typu,
--           używany, gdy lokal nie ma własnych wierszy (puste "unit"),
--   label — napis na przycisku, image — zdjęcie/rzut, text — opis,
--   rooms — "Salon z aneksem kuchennym: 42,5 | Łazienka: 6,2" (metraż po dwukropku opcjonalny,
--           suma liczy się sama). Kolejność wierszy = kolejność przycisków.
--
-- Oraz przyciski w karcie lokalu (pod "Zapytaj o lokal"):
--   cardProspectusLabel — "Prospekt informacyjny" (plik: istniejące pole prospectusUrl),
--   standardLabel / standardUrl — "Standard wykończenia" + adres PDF.
--   Pusty adres = przycisk prowadzi do formularza kontaktowego (jak główny przycisk prospektu).
--
-- Startowe wiersze: układ pomieszczeń z katalogu (str. 12–14), bez metraży i rzutów —
-- do uzupełnienia w panelu /admin.
--
-- JSON_INSERT dopisuje pole TYLKO gdy go nie ma — nie nadpisuje niczego, co już jest
-- (także zakładek dodanych wcześniej w panelu). Można uruchomić wielokrotnie.
-- Komponent: src/components/investments/foxhills/Apartments.tsx. Wymaga MySQL 5.7+ / MariaDB 10.2+.
-- =============================================================================


SET @summary_label = '{"value":"Podsumowanie","editable":true,"label":"Karta lokalu — napis pierwszego przycisku (podsumowanie)","type":"string"}';

SET @unit_views = '{"value":[{"unit":"","type":"Willa","label":"Parter","image":"","text":"","rooms":"salon z aneksem kuchennym | pokój gościnny / gabinet | łazienka | pomieszczenie gospodarcze"},{"unit":"","type":"Willa","label":"Piętro","image":"","text":"","rooms":"master bedroom | 2 sypialnie | 2 łazienki"},{"unit":"","type":"Bliźniak","label":"Parter","image":"","text":"","rooms":"salon z aneksem kuchennym | pokój gościnny / gabinet | łazienka | pomieszczenie gospodarcze"},{"unit":"","type":"Bliźniak","label":"Piętro","image":"","text":"","rooms":"master bedroom | 2 sypialnie | 2 łazienki"},{"unit":"","type":"Apartament","label":"Rzut","image":"","text":"","rooms":"salon z aneksem kuchennym | 3 sypialnie | 2 łazienki"}],"editable":true,"label":"Karta lokalu — zakładki (unit = numer lokalu LUB puste + type = dla całego typu; label = przycisk; image = zdjęcie/rzut; rooms = „Pomieszczenie: m² | ...”; kolejność = kolejność przycisków)","type":"table"}';

SET @card_prospectus_label = '{"value":"Prospekt informacyjny","editable":true,"label":"Karta lokalu — przycisk prospektu (plik: pole Prospekt informacyjny)","type":"string"}';

SET @standard_label = '{"value":"Standard wykończenia","editable":true,"label":"Karta lokalu — przycisk standardu wykończenia","type":"string"}';

SET @standard_url = '{"value":"","editable":true,"label":"Standard wykończenia (adres PDF; puste = przycisk prowadzi do formularza kontaktowego)","type":"string"}';

-- "$.sections[3].component" -> "$.sections[3]"
SET @sec = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Apartments', NULL, '$.sections[*].component')), '.component', '')
            FROM pages WHERE slug = '/inwestycja/foxhills');

UPDATE pages
SET content = JSON_INSERT(content,
  CONCAT(@sec, '.fields.summaryLabel'), JSON_EXTRACT(@summary_label, '$'),
  CONCAT(@sec, '.fields.unitViews'), JSON_EXTRACT(@unit_views, '$'),
  CONCAT(@sec, '.fields.cardProspectusLabel'), JSON_EXTRACT(@card_prospectus_label, '$'),
  CONCAT(@sec, '.fields.standardLabel'), JSON_EXTRACT(@standard_label, '$'),
  CONCAT(@sec, '.fields.standardUrl'), JSON_EXTRACT(@standard_url, '$')
)
WHERE slug = '/inwestycja/foxhills' AND @sec IS NOT NULL;

-- Kontrola
SELECT JSON_EXTRACT(content, CONCAT(@sec, '.fields.unitViews.value[*].label')) AS zakladki FROM pages WHERE slug = '/inwestycja/foxhills';
