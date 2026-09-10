-- =============================================================================
-- Migracja 008 — kasuje `collection_items` (patrz 007). Blog przeniósł się do
-- `pages` (ten sam schemat co reszta podstron — parent:"/blog", sekcje
-- BlogHero/BlogPost, patrz src/lib/sections.tsx i backend/scripts/migrate-blog-to-pages.php).
--
-- NIE URUCHAMIAJ TEGO RĘCZNIE, dopóki nie potwierdzisz, że:
--   1. `php backend/scripts/migrate-blog-to-pages.php --apply` przeszło bez
--      błędów na produkcyjnej bazie,
--   2. wpisy bloga widać poprawnie w panelu (/admin) i na stronie (/blog,
--      /blog/<slug>) zbudowanej z `pages`.
-- Do tego momentu `collection_items` jest tylko nieużywanym, ale
-- nieszkodliwym zapasowym kopiami starych danych — kasowanie jest
-- nieodwracalne.
-- =============================================================================

DROP TABLE IF EXISTS collection_items;
