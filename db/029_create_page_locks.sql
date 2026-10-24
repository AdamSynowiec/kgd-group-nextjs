-- =============================================================================
-- 029: Blokada edycji stron w panelu /admin (jedna osoba naraz na stronę)
-- =============================================================================
-- Wiersz = "ktoś ma tę stronę otwartą w edytorze". Panel odnawia blokadę co ~15 s
-- (heartbeat_at); blokada starsza niż 60 s jest martwa (np. zamknięta karta bez
-- wyjścia) i może ją zająć ktoś inny — bez ręcznego sprzątania.
--
-- lock_id — losowy identyfikator JEDNEGO otwarcia edytora (karta przeglądarki), nie
-- użytkownika: ta sama osoba w dwóch kartach też dostaje ostrzeżenie. Zapis strony
-- (POST /page) z innym lock_id niż aktualny właściciel jest odrzucany (409), więc
-- po przejęciu edycji ("Edytuj mimo to") poprzednia osoba nie nadpisze zmian.
--
-- Bez klucza obcego do users (jak activity_log) — "login" to migawka do komunikatu.
-- Można uruchomić wielokrotnie.
-- =============================================================================

CREATE TABLE IF NOT EXISTS page_locks (
  slug          VARCHAR(255)    NOT NULL,
  lock_id       CHAR(32)        NOT NULL,
  user_id       BIGINT UNSIGNED NULL,
  login         VARCHAR(190)    NOT NULL,
  acquired_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  heartbeat_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (slug),
  KEY idx_page_locks_heartbeat (heartbeat_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
