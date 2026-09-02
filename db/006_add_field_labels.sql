-- =============================================================================
-- Migracja 006 -- dodaje "label" (czytelny, polski podpis pola) do węzłów
-- {"value": ..., "editable": ...} oraz do samych sekcji, żeby panel /admin
-- pokazywał podpisy z DANYCH, a nie ze słownika zaszytego w kodzie.
-- Zobacz src/lib/editable.ts, src/components/admin/EditableField.tsx
-- i backend/src/Support/EditableMerge.php (ta migracja zakłada, że merge
-- po stronie backendu już zachowuje dodatkowe klucze przy zapisie z panelu).
--
-- W ODRÓŻNIENIU od migracji 004 (pełny nadpis kolumny "content") ta migracja
-- używa JSON_SET i modyfikuje WYŁĄCZNIE klucze "label" pod konkretnymi
-- ścieżkami. Każda inna wartość w dokumencie — w tym ewentualne zmiany
-- wprowadzone ręcznie przez panel /admin po migracji 004 (np. pole "eyebrow"
-- na stronie głównej) — zostaje nietknięta.
--
-- Klauzule WHERE dodatkowo sprawdzają, że sekcja pod danym indeksem tablicy
-- ma oczekiwane "id" — jeśli struktura w bazie różni się od zakładanej,
-- UPDATE dla tego wiersza nie zmieni nic (0 wierszy) zamiast wstawić label
-- pod złą ścieżkę. Sprawdź "Rows matched" po uruchomieniu.
--
-- Uruchom recznie, np.: mysql -u UZYTKOWNIK -p NAZWA_BAZY < db/006_add_field_labels.sql
-- =============================================================================

UPDATE pages
SET content = JSON_SET(
  content,
  '$.title.label', 'Tytuł strony',
  '$.seo.title.label', 'Tytuł SEO',
  '$.seo.description.label', 'Opis SEO',
  '$.sections[0].label', 'Sekcja powitalna',
  '$.sections[0].fields.eyebrow.label', 'Etykieta nad nagłówkiem',
  '$.sections[0].fields.heading.label', 'Nagłówek',
  '$.sections[0].fields.lead.label', 'Wprowadzenie',
  '$.sections[1].label', 'O firmie',
  '$.sections[1].fields.heading.label', 'Nagłówek'
)
WHERE slug = '/'
  AND JSON_EXTRACT(content, '$.sections[0].id') = 'hero-home'
  AND JSON_EXTRACT(content, '$.sections[1].id') = 'o-firmie';

UPDATE pages
SET content = JSON_SET(
  content,
  '$.title.label', 'Tytuł strony',
  '$.seo.title.label', 'Tytuł SEO',
  '$.seo.description.label', 'Opis SEO',
  '$.sections[0].label', 'Sekcja powitalna',
  '$.sections[0].fields.eyebrow.label', 'Etykieta nad nagłówkiem',
  '$.sections[0].fields.heading.label', 'Nagłówek',
  '$.sections[0].fields.lead.label', 'Wprowadzenie',
  '$.sections[0].fields.internalId.label', 'Identyfikator wewnętrzny',
  '$.sections[1].label', 'Treść strony',
  '$.sections[1].fields.heading.label', 'Nagłówek'
)
WHERE slug = '/o-nas'
  AND JSON_EXTRACT(content, '$.sections[0].id') = 'hero-o-nas'
  AND JSON_EXTRACT(content, '$.sections[1].id') = 'tresc-o-nas';
