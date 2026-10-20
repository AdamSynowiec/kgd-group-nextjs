-- =============================================================================
-- 028: Raportowanie cen — uprawnienia panelu
-- =============================================================================
-- Nowe uprawnienia (backend/src/Support/PermissionRegistry.php, src/lib/permissions.ts):
--   reports.list      — zakładka Ustawienia → "Raportowanie cen": katalogi i podgląd plików,
--   reports.generate  — przycisk "Generuj teraz" / "Generuj wszystkie".
-- Rola "admin" ma je automatycznie (wildcard '*'). Tutaj: podgląd dla roli "editor"
-- (generowanie zostaje tylko dla admina — można je nadać w panelu Uprawnień).
-- Można uruchomić wielokrotnie.
-- =============================================================================

INSERT INTO role_permissions (role_name, permission) VALUES
  ('editor', 'reports.list')
ON DUPLICATE KEY UPDATE permission = VALUES(permission);
