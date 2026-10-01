-- =============================================================================
-- 022: Pliki z panelu starej strony (admin/storage, admin/assets) są pod /OLD/
-- =============================================================================
-- Stara strona (Vite) działa teraz pod https://kgd-group.pl/OLD/, więc jej
-- pliki (karty lokali, prospekty, standard wykończenia) leżą w /OLD/admin/...
-- Podmienia prefiks we wszystkich stronach, w których występuje stary adres.
-- Można uruchomić wielokrotnie (nowy adres nie pasuje do wzorca).
-- =============================================================================

UPDATE pages
SET content = REPLACE(content, 'https://kgd-group.pl/admin/', 'https://kgd-group.pl/OLD/admin/')
WHERE content LIKE '%https://kgd-group.pl/admin/%';
