-- =============================================================================
-- 035: Fox Hills — obrysy lokali jako ZAKRES działki (dom + ogród), nie sam dom
-- =============================================================================
-- Nadpisuje "polygon" ośmiu lokali w sekcji Apartments (/inwestycja/foxhills) — zakres
-- według wzoru z zaznaczonymi działkami (czerwone/niebieskie obrysy na planie I etapu):
--   tylny rząd:     I.W.11, I.W.12, I.W.13, I.W.14
--   środkowy rząd:  I.B.3 (lewy), I.B.6 (prawy)
--   trzeci rząd:    I.B.7 (lewy), I.B.9 (trzeci od lewej)
-- Pozostałe lokale zostają bez zmian (obrys samego budynku z migracji 027).
--
-- Jak powstały (współrzędne zdjęcia planu/etap-1.webp, 1672×941 px):
--   1) kreski ze wzoru wyodrębnione automatycznie (maski koloru), zamknięte obszary między nimi,
--      granica = środek kreski; wzór dopasowany do planu po białych obrysach domów z 027;
--   2) własny dom lokalu zawsze w całości i dokładnie po obrysie z 027;
--   3) dom stojący bliżej (niżej na planie) zasłania tył działki za nim — jego dach jest z niej
--      wycięty; przy nachodzeniu dwóch działek granicę wyznacza bliższa;
--   4) odcinki ogrodów wyprostowane (bez drgań odręcznej kreski), narożniki domów zachowane.
--
-- Nadpisuje obrys bez względu na obecną wartość (także zmiany z panelu) — tylko te 8 lokali.
-- Lokal spoza listy jest pomijany. Można uruchomić wielokrotnie. Wymaga MySQL 5.7+ / MariaDB 10.2+.
-- =============================================================================

SET @sec = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Apartments', NULL, '$.sections[*].component')), '.component', '')
            FROM pages WHERE slug = '/inwestycja/foxhills');

-- I.W.11
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.W.11', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = '/inwestycja/foxhills');
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '690,347 694,347 695,332 730,330 734,335 787,358 799,350 784,288 762,277 761,271 711,270 708,251 649,250 646,284 625,290 609,328 612,349 626,355 680,354')
WHERE slug = '/inwestycja/foxhills' AND @sec IS NOT NULL AND @path IS NOT NULL;

-- I.W.12
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.W.12', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = '/inwestycja/foxhills');
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '820,345 832,331 855,330 874,350 959,334 911,267 845,254 841,250 826,251 810,267 810,280 786,293 798,334')
WHERE slug = '/inwestycja/foxhills' AND @sec IS NOT NULL AND @path IS NOT NULL;

-- I.W.13
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.W.13', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = '/inwestycja/foxhills');
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '985,334 1000,326 1025,340 1083,338 1100,324 1057,261 1028,261 1006,247 976,242 954,257 954,266 934,280 960,333')
WHERE slug = '/inwestycja/foxhills' AND @sec IS NOT NULL AND @path IS NOT NULL;

-- I.W.14
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.W.14', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = '/inwestycja/foxhills');
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '1143,241 1102,230 1058,262 1099,315 1135,334 1232,312 1176,234')
WHERE slug = '/inwestycja/foxhills' AND @sec IS NOT NULL AND @path IS NOT NULL;

-- I.B.3
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.B.3', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = '/inwestycja/foxhills');
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '734,335 730,330 696,332 696,369 604,380 606,424 634,436 671,439 680,436 691,440 781,446 797,437 781,374 787,358')
WHERE slug = '/inwestycja/foxhills' AND @sec IS NOT NULL AND @path IS NOT NULL;

-- I.B.6
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.B.6', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = '/inwestycja/foxhills');
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '1106,324 1084,336 1085,340 1078,346 1113,437 1214,425 1206,370 1193,355')
WHERE slug = '/inwestycja/foxhills' AND @sec IS NOT NULL AND @path IS NOT NULL;

-- I.B.7
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.B.7', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = '/inwestycja/foxhills');
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '721,464 721,452 680,436 638,452 638,478 607,481 586,563 607,578 742,580 750,487 726,483')
WHERE slug = '/inwestycja/foxhills' AND @sec IS NOT NULL AND @path IS NOT NULL;

-- I.B.9
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.B.9', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = '/inwestycja/foxhills');
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '978,571 1076,574 1090,565 1058,478 1027,475 1002,442 983,442 974,434 932,456 931,477 898,493 905,554 917,576 952,579')
WHERE slug = '/inwestycja/foxhills' AND @sec IS NOT NULL AND @path IS NOT NULL;

-- Kontrola: numery lokali i ich obrysy
SELECT JSON_EXTRACT(content, CONCAT(@sec, '.fields.units.value[*].unit')) AS lokale,
       JSON_EXTRACT(content, CONCAT(@sec, '.fields.units.value[*].polygon')) AS obrysy
FROM pages WHERE slug = '/inwestycja/foxhills';
