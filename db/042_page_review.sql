-- =============================================================================
-- 042: Akceptacja zmian edytorów (backend/src/Support/PageReview.php)
-- =============================================================================
-- Zapis strony przez kogoś BEZ uprawnienia "changes.review" (np. edytor) nie trafia od razu
-- na stronę: przed pierwszą taką zmianą zapamiętujemy wersję zatwierdzoną strony
-- (page_approved), a publiczne API, z którego czyta build, podaje tę wersję, dopóki admin
-- nie zatwierdzi zmian. Każda zmiana pola trafia do page_changes (kto, kiedy, z czego na co).
-- Edytor może poprosić o weryfikację (review_requests) — admin widzi prośbę w Cockpicie.
--
-- Tylko nowe tabele, istniejące dane bez zmian. Bezpieczne do ponownego uruchomienia.
-- Admin ma "*", więc dostaje "changes.review" automatycznie — innym rolom można je nadać
-- w Ustawienia → Uprawnienia.
-- Import: mysql -u UZYTKOWNIK -p NAZWA_BAZY < db/042_page_review.sql
-- =============================================================================

-- Wersja zatwierdzona strony — istnieje tylko, gdy strona ma niezatwierdzone zmiany.
-- content NULL = strona nowa (utworzona przez edytora), niewidoczna, dopóki nie zostanie zatwierdzona.
CREATE TABLE IF NOT EXISTS page_approved (
  slug        VARCHAR(255) NOT NULL,
  content     JSON         NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historia zmian pól: każdy zapis strony = wiersz na każde zmienione pole.
CREATE TABLE IF NOT EXISTS page_changes (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(255)    NOT NULL,
  field_key    VARCHAR(512)    NOT NULL,
  label        VARCHAR(255)    NOT NULL,
  old_value    JSON            NULL,
  new_value    JSON            NULL,
  user_id      BIGINT UNSIGNED NULL,
  login        VARCHAR(190)    NULL,
  status       ENUM('pending', 'approved', 'reverted') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at  TIMESTAMP       NULL,
  resolved_by  VARCHAR(190)    NULL,
  PRIMARY KEY (id),
  KEY idx_page_changes_status (status, slug),
  KEY idx_page_changes_slug (slug, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prośby edytorów o weryfikację ("Powiadom o zmianach").
CREATE TABLE IF NOT EXISTS review_requests (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NULL,
  login        VARCHAR(190)    NOT NULL,
  message      TEXT            NULL,
  status       ENUM('open', 'done') NOT NULL DEFAULT 'open',
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at  TIMESTAMP       NULL,
  resolved_by  VARCHAR(190)    NULL,
  PRIMARY KEY (id),
  KEY idx_review_requests_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
