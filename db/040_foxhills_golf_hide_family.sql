-- =============================================================================
-- 040: Fox Hills — sekcja Golf: ukrycie bloku "RODZINNE CHWILE W NAJLEPSZYM WYDANIU."
-- =============================================================================
-- Czyści WYŁĄCZNIE dwie wartości w sekcji Golf strony /inwestycja/foxhills:
--   fields.familyHeader.value  ("Rodzinne chwile — nagłówek")
--   fields.familyText.value    ("Rodzinne chwile — opis")
-- Golf.tsx pokazuje blok (nagłówek, opis i zdjęcie po lewej) tylko gdy nagłówek lub opis
-- nie jest pusty — po migracji blok znika ze strony.
--
-- Nic nie jest usuwane: pola, ich etykiety, zdjęcie (familyImage) i alt zostają w bazie,
-- reszta strony (zmiany z /admin) bez zmian. Przywrócenie = wpisanie tekstów w panelu
-- albo blok "PRZYWRÓCENIE" na dole pliku.
--
-- Bezpieczne do ponownego uruchomienia. Gdy na stronie nie ma sekcji o id "golf" — nic się nie dzieje.
-- Komponent: src/components/investments/foxhills/Golf.tsx. Wymaga MySQL 5.7+ / MariaDB 10.2+.
-- =============================================================================

-- Kopia obecnych wartości przed zmianą (zapisz wynik, gdyby trzeba było przywrócić inne teksty niż poniżej)
SELECT JSON_EXTRACT(content, '$.sections[*].fields.familyHeader.value') AS familyHeader,
       JSON_EXTRACT(content, '$.sections[*].fields.familyText.value') AS familyText
FROM pages WHERE slug = '/inwestycja/foxhills';

-- "$.sections[3].id" -> 3
SET @idx = (SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'golf', NULL, '$.sections[*].id')), '[', -1), ']', 1)
            FROM pages WHERE slug = '/inwestycja/foxhills');

UPDATE pages
SET content = JSON_SET(
  content,
  CONCAT('$.sections[', @idx, '].fields.familyHeader.value'), '',
  CONCAT('$.sections[', @idx, '].fields.familyText.value'), ''
)
WHERE slug = '/inwestycja/foxhills'
  AND @idx IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(content, CONCAT('$.sections[', @idx, '].component'))) = 'Golf'
  AND JSON_CONTAINS_PATH(content, 'all',
        CONCAT('$.sections[', @idx, '].fields.familyHeader.value'),
        CONCAT('$.sections[', @idx, '].fields.familyText.value'));

-- Kontrola: oba pola powinny być puste ("")
SELECT JSON_EXTRACT(content, CONCAT('$.sections[', @idx, '].fields.familyHeader.value')) AS familyHeader,
       JSON_EXTRACT(content, CONCAT('$.sections[', @idx, '].fields.familyText.value')) AS familyText
FROM pages WHERE slug = '/inwestycja/foxhills';

-- -----------------------------------------------------------------------------
-- PRZYWRÓCENIE (odkomentuj i uruchom razem z linią "SET @idx" powyżej):
-- (najprościej jednak wpisać oba teksty z powrotem w panelu /admin)
-- UPDATE pages
-- SET content = JSON_SET(
--   content,
--   CONCAT('$.sections[', @idx, '].fields.familyHeader.value'), 'RODZINNE CHWILE\nW NAJLEPSZYM WYDANIU.',
--   CONCAT('$.sections[', @idx, '].fields.familyText.value'), 'Piękno przyrody, odpoczynek od codzienności, dobre towarzystwo i niezapomniane chwile.'
-- )
-- WHERE slug = '/inwestycja/foxhills' AND @idx IS NOT NULL;
-- -----------------------------------------------------------------------------
