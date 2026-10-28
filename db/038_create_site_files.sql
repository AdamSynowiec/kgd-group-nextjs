-- =============================================================================
-- 038: Pliki serwisu edytowane w panelu (Ustawienia → Pliki serwisu), np. robots.txt
-- =============================================================================
-- site_files — treść pliku podanego w rejestrze backend/src/Support/SiteFiles.php.
--              Brak wiersza = plik domyślny, generowany przez Next.js (src/lib/siteFiles.ts).
--              Zmiana trafia na stronę przy najbliższej publikacji (build).
--
-- Uprawnienie panelu site.files.manage: rola "admin" ma je automatycznie ('*'), innym rolom
-- można je nadać w panelu Uprawnień.
-- Nic poza tym nie jest zmieniane. Można uruchomić wielokrotnie.
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_files (
  name        VARCHAR(64)   NOT NULL,
  content     MEDIUMTEXT    NOT NULL,
  updated_by  VARCHAR(190)  NULL,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
