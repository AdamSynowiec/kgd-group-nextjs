-- =============================================================================
-- Migracja 011 -- centralny system RBAC + indywidualne "deny": operacyjne
-- uprawnienia panelu /admin (kto może w ogóle WYWOŁAĆ daną operację API —
-- np. users.create, roles.delete), ODRĘBNE od ACL treści strona/pole
-- (acl.role/acl.permission w kolumnie pages.content — patrz db/009, db/010,
-- kto widzi/edytuje KTÓRĄ KONKRETNĄ stronę). Obie warstwy muszą przejść,
-- żeby np. zapisać treść strony — patrz backend/src/Support/Authorization.php.
--
-- Rejestr WSZYSTKICH dozwolonych stringów uprawnień żyje w kodzie, nie w
-- bazie (backend/src/Support/PermissionRegistry.php, mirror
-- src/lib/permissions.ts) — bo każdy musi odpowiadać realnie wymuszanej
-- operacji; nie da się go tworzyć z panelu. Baza trzyma tylko DWA mapowania:
--
--   role_permissions        — które uprawnienia ma dana ROLA (edytowalne
--                              w panelu, sekcja "Uprawnienia").
--   user_permission_denies  — które uprawnienia zostały ODEBRANE
--                              KONKRETNEMU userowi mimo jego roli. Zawsze
--                              ma pierwszeństwo przed nadaniem z roli. NIE
--                              wprowadzamy odwrotności (indywidualny
--                              "allow") — patrz backend/src/Support/Authorization.php.
--
-- Efektywne uprawnienie (patrz MysqlPermissionRepository::effectiveHas()):
--   deny na (user_id, permission)                    -> false
--   inaczej role_permissions ma (role, permission)
--     LUB (role, '*')                                -> true
--   inaczej                                           -> false
--
-- Rola "admin" dostaje jeden wiersz-wildcard ('admin', '*') zamiast 15
-- osobnych wierszy — i jest NIEMODYFIKOWALNA przez API
-- (PermissionsController::updateRolePermissions odrzuca role_name='admin'
-- bezwarunkowo, tak samo jak RolesController::deleteRole już odrzuca
-- usunięcie roli o tej nazwie).
--
-- "editor"/"blog" dostają identyczny zestaw na tym poziomie — ich realna
-- różnica (blog widzi tylko swoje wpisy) zostaje wyłącznie w ACL treści,
-- nie tutaj. Nowa rola utworzona później w panelu startuje z ZEREM
-- uprawnień, dopóki admin jej czegoś nie przypisze (domyślna odmowa,
-- zgodnie z regułą "zwykłe role dostają wyłącznie jawnie przypisane
-- uprawnienia").
--
-- FK ON DELETE CASCADE - usunięcie roli/konta sprząta powiązane wiersze
-- automatycznie (siatka bezpieczeństwa; RolesController/UsersController i
-- tak już blokują usuwanie roli/konta które by to normalnie wywołało).
--
-- Uruchom ręcznie, np.: mysql -u UZYTKOWNIK -p NAZWA_BAZY < db/011_create_permission_tables.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  role_name  VARCHAR(50)  NOT NULL,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_name, permission),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_name) REFERENCES roles(name) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_permission_denies (
  user_id    BIGINT UNSIGNED NOT NULL,
  permission VARCHAR(100)    NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission),
  CONSTRAINT fk_user_denies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO role_permissions (role_name, permission) VALUES
  ('admin', '*'),
  ('editor', 'pages.list'), ('editor', 'pages.read'), ('editor', 'pages.create'), ('editor', 'pages.update'), ('editor', 'pages.delete'), ('editor', 'assets.upload'),
  ('blog', 'pages.list'), ('blog', 'pages.read'), ('blog', 'pages.create'), ('blog', 'pages.update'), ('blog', 'pages.delete'), ('blog', 'assets.upload')
ON DUPLICATE KEY UPDATE permission = VALUES(permission);
