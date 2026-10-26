-- =============================================================================
-- 034: Assets — biblioteka wgranych plików w panelu (/admin/assets)
-- =============================================================================
-- Pliki fizycznie zostają tam, gdzie były: api/uploads/<losowa nazwa> (UploadController.php),
-- więc adresy wpisane już w treść stron (/api/uploads/...) się nie zmieniają. Katalogi są
-- wyłącznie porządkiem w bazie — przeniesienie pliku do innego katalogu nie zmienia jego adresu.
--
-- assets         — jeden wiersz = jeden plik z api/uploads/ (filename = nazwa na dysku),
--                  "name" = nazwa widoczna w panelu (przy wgraniu: oryginalna nazwa pliku).
--                  Pliki wgrane przed tą migracją dopisują się same przy pierwszym otwarciu
--                  biblioteki (nazwy odzyskane z historii aktywności, gdy się da).
-- asset_folders  — drzewo katalogów (parent_id NULL = najwyższy poziom).
--
-- Uprawnienia (PermissionRegistry.php, src/lib/permissions.ts):
--   assets.list    — zakładka "Assets" i wybieranie plików z biblioteki w edytorze,
--   assets.manage  — katalogi, przenoszenie, zmiana nazw,
--   assets.delete  — usuwanie plików z serwera.
-- Rola "admin" ma je automatycznie ('*'); "editor" dostaje list + manage (usuwanie — w panelu Uprawnień).
-- Można uruchomić wielokrotnie.
-- =============================================================================

CREATE TABLE IF NOT EXISTS asset_folders (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  parent_id   BIGINT UNSIGNED NULL,
  name        VARCHAR(120)    NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_asset_folders_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assets (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  filename     VARCHAR(100)    NOT NULL,
  name         VARCHAR(255)    NOT NULL,
  folder_id    BIGINT UNSIGNED NULL,
  mime         VARCHAR(100)    NULL,
  size         BIGINT UNSIGNED NOT NULL DEFAULT 0,
  width        INT UNSIGNED    NULL,
  height       INT UNSIGNED    NULL,
  uploaded_by  VARCHAR(190)    NULL,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_assets_filename (filename),
  KEY idx_assets_folder (folder_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO role_permissions (role_name, permission) VALUES
  ('editor', 'assets.list'),
  ('editor', 'assets.manage')
ON DUPLICATE KEY UPDATE permission = VALUES(permission);
