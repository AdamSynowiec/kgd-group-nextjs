-- =============================================================================
-- 025: Fox Hills — sekcje "Standard", "Twój adres. Twoja inwestycja", "Inwestycja z perspektywą"
-- =============================================================================
-- Dopisuje do strony /inwestycja/foxhills trzy nowe sekcje z katalogu
-- (Katalog FOX HILLS, str. 16, 18 i 19; teksty 1:1 z katalogu):
--   BuildStandard     — przed sekcją "Standard wykończenia" (Standards),
--   Investment        — zaraz po Standards,
--   InvestmentOutlook — zaraz po Investment.
--
-- NIE nadpisuje strony (w przeciwieństwie do db/inwestycje/foxhills.sql): wstawia
-- tylko brakujące sekcje do aktualnej treści z bazy, reszta (zmiany z /admin)
-- zostaje bez zmian. Sekcja, która już istnieje, jest pomijana — można uruchomić
-- wielokrotnie. Jeśli na stronie nie ma sekcji Standards, nic się nie dzieje.
--
-- Komponenty: src/components/investments/foxhills/{BuildStandard,Investment,InvestmentOutlook}.tsx.
-- Wymaga MySQL 5.7+ / MariaDB 10.2+.
-- =============================================================================

SET @slug = '/inwestycja/foxhills';

SET @build_standard = '{"id":"buildstandard","hashId":"standard-budynkow","component":"BuildStandard","type":"section","label":"Standard (budynki i instalacje)","fields":{"eyebrow":{"value":"","editable":true,"label":"Nadtytuł","type":"string"},"header":{"value":"STANDARD","editable":true,"label":"Nagłówek","type":"string"},"accent":{"value":"","editable":true,"label":"Akcent (kursywa)","type":"string"},"text":{"value":"Trwałe materiały, wysoka jakość wykonania i nowoczesne rozwiązania, które zapewniają codzienny komfort i spokój na lata.","editable":true,"label":"Opis","type":"string"},"image":{"value":"/investments/foxhills/standard/balkon.webp","editable":true,"label":"Zdjęcie","type":"asset"},"imageAlt":{"value":"Detal elewacji Fox Hills Residences — taras ze szklaną balustradą","editable":true,"label":"Opis zdjęcia (alt)","type":"string"},"items":{"value":[{"icon":"heating","title":"OGRZEWANIE","text":"Nowoczesny, energooszczędny system ogrzewania - pompa ciepła i ogrzewanie podłogowe."},{"icon":"snowflake","title":"KLIMATYZACJA","text":"Przygotowana instalacja pod montaż klimatyzacji."},{"icon":"smarthome","title":"SMART HOME","text":"Możliwość integracji z systemem inteligentnego domu - sterowanie komfortem, bezpieczeństwem i energią"},{"icon":"gear","title":"INSTALACJE","text":"Nowoczesne instalacje elektryczne, wodno-kanalizacyjne i techniczne, zgodne z aktualnymi standardami."},{"icon":"car","title":"GARAŻE/ MIEJSCA POSTOJOWE","text":"Prywatne garaże lub miejsca postojowe na terenie osiedla, z przygotowaniem pod ładowarki do aut elektrycznych."},{"icon":"stairs","title":"STANDARD CZĘŚCI WSPÓLNYCH","text":"Reprezentacyjne części wspólne wykończone z dbałością o detale."}],"editable":true,"label":"Cechy standardu (ikony: heating, snowflake, smarthome, gear, car, stairs, home, key, shield …)","type":"table"}}}';

SET @investment = '{"id":"investment","hashId":"inwestycja","component":"Investment","type":"section","label":"Twój adres. Twoja inwestycja","fields":{"eyebrow":{"value":"","editable":true,"label":"Nadtytuł","type":"string"},"header":{"value":"TWÓJ ADRES.","editable":true,"label":"Nagłówek","type":"string"},"accent":{"value":"TWOJA INWESTYCJA","editable":true,"label":"Akcent (kursywa)","type":"string"},"paragraphs":{"value":["Fox Hills to nie tylko miejsce do życia, ale również możliwość zakupu nieruchomości w celach inwestycyjnych.","Właściciele, którzy zdecydują się przeznaczyć swoją nieruchomość na wynajem, będą mogli skorzystać ze wsparcia partnera KGD odpowiedzialnego za profesjonalną obsługę najmu i bieżące zarządzanie nieruchomością."],"editable":true,"label":"Akapity opisu","type":"table"},"image":{"value":"/investments/foxhills/types/apartamenty.webp","editable":true,"label":"Zdjęcie","type":"asset"},"imageAlt":{"value":"Budynki Fox Hills Residences przy polu golfowym","editable":true,"label":"Opis zdjęcia (alt)","type":"string"},"items":{"value":[{"icon":"key","title":"PROFESJONALNA OBSLUGA NAJMU","text":"Kompleksowe wsparcie w procesie wynajmu oraz pozyskiwaniu gości i najemców."},{"icon":"home","title":"ZARZĄDANIE NIERUCHOMOŚCIĄ","text":"Bieżąca opieka nad lokalem, obsługa gości, koordynacja serwisu i utrzymania nieruchomośc."},{"icon":"users","title":"WSPARCIE WŁAŚCICIELA","text":"Jeden partner odpowiedzialny za cały proces."},{"icon":"chart","title":"POTENCJAŁ INWESTYCYJNY","text":"Wyjątkowa lokalizacja, pole golfowe, bliskość Krakowa i całoroczne atrakcje to wysoki potencjał najmu."}],"editable":true,"label":"Filary (ikony: key, home, users, chart, handshake, shield …)","type":"table"}}}';

SET @investment_outlook = '{"id":"investmentoutlook","hashId":"perspektywa","component":"InvestmentOutlook","type":"section","label":"Inwestycja z perspektywą","fields":{"header":{"value":"INWESTYCJA","editable":true,"label":"Nagłówek","type":"string"},"accent":{"value":"Z PERSPEKTYWĄ.","editable":true,"label":"Akcent (kursywa)","type":"string"},"text":{"value":"Połączenie unikalnej lokalizacji, wysokiego standardu i profesjonalnego zarządzania najmem sprawia, że Fox Hills to atrakcyjna i stabilna inwestycja na lata.","editable":true,"label":"Opis","type":"string"},"image":{"value":"/investments/foxhills/investment/wnetrze.webp","editable":true,"label":"Zdjęcie (szerokie)","type":"asset"},"imageAlt":{"value":"Wnętrze rezydencji Fox Hills z widokiem na pole golfowe o zachodzie słońca","editable":true,"label":"Opis zdjęcia (alt)","type":"string"},"partnerHeader":{"value":"PARTNER ZARZĄDZAJĄCY NAJMEM","editable":true,"label":"Partner — nagłówek","type":"string"},"partnerText":{"value":"Współpracujemy z doświadczonym partnerem, który zapewnia kompleksową obsługę najmu oraz profesjonalne zarządzanie nieruchomością.","editable":true,"label":"Partner — opis","type":"string"},"partnerImage":{"value":"/investments/foxhills/investment/osiedle-zachod.webp","editable":true,"label":"Partner — zdjęcie","type":"asset"},"partnerImageAlt":{"value":"Osiedle Fox Hills Residences z lotu ptaka o zachodzie słońca","editable":true,"label":"Partner — opis zdjęcia (alt)","type":"string"}}}';

-- "$.sections[5].component" -> 5
-- 1) BuildStandard — przed Standards
SET @idx = (SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Standards', NULL, '$.sections[*].component')), '[', -1), ']', 1)
            FROM pages WHERE slug = @slug);
UPDATE pages
SET content = JSON_ARRAY_INSERT(content, CONCAT('$.sections[', @idx, ']'), JSON_EXTRACT(@build_standard, '$'))
WHERE slug = @slug
  AND @idx IS NOT NULL
  AND JSON_SEARCH(content, 'one', 'BuildStandard', NULL, '$.sections[*].component') IS NULL;

-- 2) Investment — po Standards
SET @idx = (SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Standards', NULL, '$.sections[*].component')), '[', -1), ']', 1)
            FROM pages WHERE slug = @slug);
UPDATE pages
SET content = JSON_ARRAY_INSERT(content, CONCAT('$.sections[', @idx + 1, ']'), JSON_EXTRACT(@investment, '$'))
WHERE slug = @slug
  AND @idx IS NOT NULL
  AND JSON_SEARCH(content, 'one', 'Investment', NULL, '$.sections[*].component') IS NULL;

-- 3) InvestmentOutlook — po Investment
SET @idx = (SELECT SUBSTRING_INDEX(SUBSTRING_INDEX(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Investment', NULL, '$.sections[*].component')), '[', -1), ']', 1)
            FROM pages WHERE slug = @slug);
UPDATE pages
SET content = JSON_ARRAY_INSERT(content, CONCAT('$.sections[', @idx + 1, ']'), JSON_EXTRACT(@investment_outlook, '$'))
WHERE slug = @slug
  AND @idx IS NOT NULL
  AND JSON_SEARCH(content, 'one', 'InvestmentOutlook', NULL, '$.sections[*].component') IS NULL;

-- Kontrola: lista sekcji po migracji
SELECT JSON_EXTRACT(content, '$.sections[*].component') AS sections FROM pages WHERE slug = @slug;
