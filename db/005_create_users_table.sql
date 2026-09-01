-- =============================================================================
-- Migracja 005 — tabela `users`: konta do logowania w panelu /admin.
--
-- Hasła są TRZYMANE WYŁĄCZNIE jako hash (password_hash() w PHP — bcrypt albo
-- argon2i, zależnie od buildu PHP na hostingu), nigdy jawnym tekstem.
--
-- "role" na razie rozróżnia dwa poziomy dostępu (patrz BasicAuth.php,
-- AdminController.php i admin.php):
--   "admin"  — pełny dostęp: edycja stron ORAZ przycisk "Zbuduj stronę"
--   "editor" — tylko edycja treści stron, bez wyzwalania builda (dostanie 403)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  login      VARCHAR(190)    NOT NULL,
  password   VARCHAR(255)    NOT NULL,
  role       VARCHAR(50)     NOT NULL DEFAULT 'editor',
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_login (login)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Pierwsze konto — odkomentuj i WYPEŁNIJ hash hasła, zanim uruchomisz.
--
-- Jak wygenerować hash: wgraj RĘCZNIE (poza CI, poza cyklem deployu)
-- backend/tools/hash-password.php na serwer i wywołaj go raz, np.:
--   curl -d password=twoje-haslo https://twojadomena.pl/api/tools/hash-password.php
-- Skopiuj zwrócony hash poniżej, uruchom ten INSERT, USUŃ narzędzie z serwera.
-- -----------------------------------------------------------------------------

-- INSERT INTO users (login, password, role) VALUES
--   ('admin', 'WKLEJ-TU-HASH-Z-hash-password.php', 'admin');
