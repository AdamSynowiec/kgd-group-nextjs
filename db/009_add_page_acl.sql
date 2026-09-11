-- =============================================================================
-- Migracja 009 -- ACL na poziomie CAŁEJ STRONY: kto (jaka rola z tabeli
-- `users`, patrz db/005_create_users_table.sql) widzi/edytuje którą stronę
-- w panelu /admin.
--
-- Kształt (patrz src/lib/acl.ts i backend/src/Support/Acl.php):
--   "acl": {"role": "<nazwa roli>", "permission": "read"|"write"|"read/write"}
-- na najwyższym poziomie JSON-a strony, obok "slug"/"title"/"sections" —
-- NIE wewnątrz pojedynczych pól (te też mogą mieć własne "acl", ale ta
-- migracja ich nie dotyka; patrz EditableField.tsx/EditableMerge.php, gdzie
-- pole bez "acl" i tak domyślnie widzi/edytuje tylko rola "admin").
--
-- Reguła egzekwowana przez Acl::canRead()/canWrite(): BRAK "acl" oznacza
-- "tylko rola admin". Ta migracja czyni to jawnym w danych (zamiast polegać
-- wyłącznie na nieobecności klucza) i NADPISUJE wyjątkiem strony bloga:
--
--   1) wszystkie strony                    -> acl:{role:"admin",permission:"read/write"}
--   2) strony bloga ("/blog" i "/blog/**") -> acl:{role:"blog", permission:"read/write"}
--      (lista bloga sama w sobie ma slug "/blog"; każdy wpis ma
--      parent:"/blog" i slug postaci "/blog/<slug-wpisu>" — patrz
--      src/lib/pageTemplates.ts — stąd LIKE '/blog/%' zamiast czytania JSON-a)
--
-- Rola "admin" i tak zawsze przechodzi każdy check (patrz Acl::check) —
-- krok 1) jest więc czysto dokumentacyjny/jawny dla stron nie-blogowych,
-- ale krok 2) realnie OGRANICZA dostęp do stron bloga do roli "blog"
-- (redaktor bloga nie zobaczy już np. strony głównej czy stron inwestycji
-- na liście w panelu, i odwrotnie: rola bez "admin"/"blog" nie zobaczy nic).
--
-- Idempotentna — bezpieczna do wielokrotnego uruchomienia.
-- Uruchom ręcznie, np.: mysql -u UZYTKOWNIK -p NAZWA_BAZY < db/009_add_page_acl.sql
-- =============================================================================

UPDATE pages
SET content = JSON_SET(content, '$.acl', JSON_OBJECT('role', 'admin', 'permission', 'read/write'));

UPDATE pages
SET content = JSON_SET(content, '$.acl', JSON_OBJECT('role', 'blog', 'permission', 'read/write'))
WHERE slug = '/blog' OR slug LIKE '/blog/%';
