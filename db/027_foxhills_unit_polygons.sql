-- =============================================================================
-- 027: Fox Hills — każdy lokal zaznaczony osobno na planie I etapu
-- =============================================================================
-- Dopisuje do każdego lokalu w sekcji Apartments (/inwestycja/foxhills) kolumnę
-- "polygon": obrys lokalu na zdjęciu planu (plan/etap-1.webp, 1672×941 px),
-- format jak w strefach: "x,y x,y ..." (kilka wielokątów rozdziel znakiem |).
-- Lokal z obrysem jest na planie osobnym kształtem w kolorze statusu; najechanie
-- pokazuje mini-kartę, kliknięcie otwiera kartę lokalu. Strefa planu zostaje
-- rysowana tylko, gdy żaden jej lokal nie ma obrysu (np. budynek SPA).
--
-- Obrysy prowadzone po krawędziach budynków: kalenica i okapy dachu, narożniki
-- ścian, dół elewacji; tam, gdzie dach domu z przodu zasłania dom z tyłu, granicą
-- jest linia tego dachu. Wille — razem z płaskim garażem; bliźniaki — sam dom (bez
-- wspólnego łącznika/tarasu między parą); apartamenty — .B = piętro z dachem do
-- spodu płyty balkonu, .A = kondygnacja pod nim.
--
-- Przypisanie numerów do budynków ustalone ze zdjęcia planu i wielkości ogrodów
-- (katalog nie numeruje budynków) — DO WERYFIKACJI z PZT:
--   tylny rząd (wolnostojące z garażem), od lewej:   I.W.11, I.W.12, I.W.13, I.W.14
--   środkowy rząd (pary bliźniaków), od lewej:       I.B.3, I.B.4, I.B.5, I.B.6
--   drugi rząd (pary bliźniaków), od lewej:          I.B.7, I.B.8, I.B.9, I.B.10
--   przód (apartamenty, 6 budynków), od lewej:       A7 … A12
-- Zła kolejność = zamiana wartości "polygon" między wierszami w panelu /admin.
--
-- Ustawia obrys tylko, gdy lokal go nie ma albo ma pierwszą, zgrubną wersję z tej
-- migracji — obrys zmieniony ręcznie w panelu zostaje. Lokal spoza listy jest
-- pomijany. Można uruchomić wielokrotnie. Wymaga MySQL 5.7+ / MariaDB 10.2+.
-- =============================================================================

SET @slug = '/inwestycja/foxhills';
SET @sec = (SELECT REPLACE(JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'Apartments', NULL, '$.sections[*].component')), '.component', '')
            FROM pages WHERE slug = @slug);

-- I.W.11
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.W.11', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '648,250 707,250 710,270 761,270 761,329 731,329 697,347 650,347 647,300')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '645,290 680,250 715,285 768,285 768,330 715,338 648,335'));
-- I.W.12
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.W.12', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '810,267 826,251 841,250 861,270 911,270 933,307 933,329 862,331 851,330 830,340 815,330 810,300')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '810,292 845,252 890,282 935,285 935,330 893,338 812,333'));
-- I.W.13
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.W.13', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '954,257 977,242 1003,246 1065,285 1066,313 1047,322 1030,329 1000,328 975,316 955,300')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '950,262 985,243 1045,265 1068,285 1068,325 1010,330 952,315'));
-- I.W.14
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.W.14', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '1082,246 1100,230 1150,243 1200,266 1201,294 1196,300 1180,310 1140,311 1110,295 1081,272')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '1075,250 1110,230 1170,255 1205,278 1205,315 1150,330 1080,310'));
-- I.B.3
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.B.3', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '695,332 730,330 770,389 770,433 702,435 696,390')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '695,368 730,330 770,365 770,428 698,430'));
-- I.B.4
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.B.4', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '821,343 832,331 855,330 911,389 910,433 830,433 830,388')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '820,370 850,333 905,368 905,430 822,432'));
-- I.B.5
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.B.5', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '979,337 1000,326 1082,374 1082,425 1015,432 968,402 965,360')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '968,355 1010,328 1075,355 1080,400 1060,428 1000,418 968,395'));
-- I.B.6
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.B.6', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '1084,336 1105,324 1199,369 1200,408 1132,414 1110,390 1088,365')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '1082,345 1120,320 1185,350 1197,370 1197,410 1140,420 1090,395'));
-- I.B.7
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.B.7', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '637,452 679,436 721,452 722,562 639,562')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '637,490 680,437 722,488 722,575 640,575'));
-- I.B.8
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.B.8', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '784,457 826,436 887,511 887,562 795,566 789,520')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '783,488 820,437 885,500 885,575 790,575'));
-- I.B.9
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.B.9', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '931,457 974,434 1059,512 1059,570 975,571 930,522')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '927,470 965,437 1050,500 1058,560 1000,575 930,560'));
-- I.B.10
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.B.10', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '1074,452 1090,431 1150,455 1210,500 1210,520 1200,560 1128,562 1126,530 1080,500')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '1070,465 1110,433 1185,490 1210,505 1210,555 1140,565 1078,545'));
-- I.A7.B
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.A7.B', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '585,588 626,582 666,600 665,699 663,740 576,740 574,690')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '575,640 622,585 668,630 668,728 575,728'));
-- I.A7.A
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.A7.A', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '576,741 664,741 659,768 577,768')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '575,728 668,728 668,768 575,768'));
-- I.A8.B
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.A8.B', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '736,602 774,585 817,600 830,697 830,742 741,742 740,705')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '733,632 782,587 832,632 832,728 733,728'));
-- I.A8.A
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.A8.A', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '741,742 830,742 826,770 745,770')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '733,728 832,728 832,768 733,768'));
-- I.A9.B
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.A9.B', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '861,610 906,590 950,627 989,709 990,752 895,752 875,720 866,680')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '862,640 915,592 990,640 990,740 862,740'));
-- I.A9.A
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.A9.A', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '895,753 990,753 987,782 898,783')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '862,740 990,740 990,782 862,782'));
-- I.A10.B
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.A10.B', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '1010,605 1057,586 1100,610 1157,700 1158,750 1062,752 1060,700 1050,678')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '1000,640 1055,588 1158,650 1158,735 1000,742'));
-- I.A10.A
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.A10.A', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '1062,752 1158,750 1150,777 1062,780')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '1000,742 1158,735 1158,770 1000,782'));
-- I.A11.B
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.A11.B', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '1147,597 1188,573 1238,605 1322,685 1322,735 1225,735 1195,718 1170,680 1150,640')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '1138,620 1205,576 1280,610 1320,650 1320,712 1222,722 1150,690'));
-- I.A11.A
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.A11.A', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '1195,718 1225,735 1322,735 1318,763 1228,768 1210,752')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '1150,690 1222,722 1320,712 1320,752 1225,762 1150,730'));
-- I.A12.B
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.A12.B', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '1282,582 1332,560 1400,600 1465,660 1468,705 1385,708 1352,705 1352,645')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '1280,600 1340,560 1440,620 1470,690 1380,700 1320,680'));
-- I.A12.A
SET @path = (SELECT JSON_UNQUOTE(JSON_SEARCH(content, 'one', 'I.A12.A', NULL, CONCAT(@sec, '.fields.units.value[*].unit'))) FROM pages WHERE slug = @slug);
SET @poly = CONCAT(LEFT(@path, CHAR_LENGTH(@path) - 4), 'polygon');
UPDATE pages SET content = JSON_SET(content, @poly, '1352,706 1468,706 1462,745 1385,748 1355,740')
WHERE slug = @slug AND @sec IS NOT NULL AND @path IS NOT NULL
  AND (JSON_EXTRACT(content, @poly) IS NULL OR JSON_UNQUOTE(JSON_EXTRACT(content, @poly)) IN ('', '1320,680 1380,700 1470,690 1470,735 1385,745 1320,720'));

-- Kontrola: numery lokali i ich obrysy
SELECT JSON_EXTRACT(content, CONCAT(@sec, '.fields.units.value[*].unit')) AS lokale,
       JSON_EXTRACT(content, CONCAT(@sec, '.fields.units.value[*].polygon')) AS obrysy
FROM pages WHERE slug = @slug;
