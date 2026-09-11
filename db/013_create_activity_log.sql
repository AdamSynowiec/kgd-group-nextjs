-- =============================================================================
-- Migracja 013 -- historia aktywności kont w panelu /admin ("co inne konta
-- robiły"), sekcja "Aktywność" w Ustawieniach. Dostęp tylko dla roli "admin"
-- (nowe uprawnienie "activity.list" w PermissionRegistry — patrz db/011 —
-- CELOWO nie nadane żadnej roli poza "admin" w seedzie: rola "admin" ma je
-- przez wildcard '*', "editor"/"blog" go nie dostają, więc domyślnie widzi
-- to wyłącznie admin, tym samym mechanizmem RBAC co reszta panelu — nie ma
-- tu osobnego, zaszytego na sztywno warunku roli).
--
-- Log jest APEND-ONLY, bez UPDATE/DELETE z panelu (nie ma do tego endpointu)
-- i BEZ klucza obcego do `users` — celowo: wpis ma przeżyć usunięcie konta,
-- które go wygenerowało (inaczej "kto usunął tego użytkownika" znikałoby
-- razem z ofiarą kaskady). "login" jest więc zapisywany jako migawka tekstu
-- w chwili zdarzenia, nie odczytywany później przez JOIN.
--
-- "details" (JSON) niesie dodatkowy kontekst zdarzenia (np. jakie
-- uprawnienia nadano roli) — NIGDY hasła/hashe, nawet gdy akcja dotyczy
-- zmiany hasła (patrz UsersController::updateOwnAccount()) — tam loguje się
-- tylko fakt zmiany, nie jej treść.
--
-- Uruchom ręcznie, np.: mysql -u UZYTKOWNIK -p NAZWA_BAZY < db/013_create_activity_log.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NULL,
  login      VARCHAR(190)    NULL,
  action     VARCHAR(100)    NOT NULL,
  target     VARCHAR(255)    NULL,
  details    JSON            NULL,
  ip_address VARCHAR(45)     NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_log_user (user_id),
  KEY idx_activity_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
