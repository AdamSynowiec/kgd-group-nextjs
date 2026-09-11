-- =============================================================================
-- Migracja 012 -- dodaje "email" do `users` pod samoobsługową edycję
-- WŁASNEGO konta (hasło + email) w panelu, sekcja "Moje konto"
-- (UsersController::updateOwnAccount(), POST /account w admin.php).
--
-- Nullable + UNIQUE: istniejące konta nie mają dziś adresu (kolumna nie
-- istniała), MySQL traktuje każdy NULL jako odrębny więc to nie koliduje;
-- ustawiony e-mail musi być unikalny między kontami.
--
-- "POST /account" celowo NIE wymaga żadnego uprawnienia z rejestru
-- (backend/src/Support/PermissionRegistry.php, patrz db/011) — każdy
-- zalogowany może zmienić WYŁĄCZNIE własne konto (identyfikowane po userId
-- z tokenu, nigdy z ciała żądania), więc rola/uprawnienia nie mają tu nic do
-- ograniczenia — to nie jest operacja na cudzych danych. Sama zmiana wymaga
-- podania obecnego hasła (password_verify()) — to prawdziwe zabezpieczenie
-- tego endpointu, nie ACL.
--
-- Uruchom ręcznie, np.: mysql -u UZYTKOWNIK -p NAZWA_BAZY < db/012_add_user_email.sql
-- =============================================================================

ALTER TABLE users
  ADD COLUMN email VARCHAR(190) NULL AFTER login,
  ADD UNIQUE KEY uq_users_email (email);
