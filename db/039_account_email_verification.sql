-- =============================================================================
-- 039: Potwierdzanie adresu e-mail kont panelu + reset hasła mailem
-- =============================================================================
-- users.email_verified_at — kiedy adres w users.email został potwierdzony linkiem z maila.
--                           Konto bez potwierdzonego adresu nie może korzystać z panelu, dopóki
--                           go nie poda i nie kliknie linku (AccountController::requireVerifiedEmail()).
-- users.pending_email     — adres podany, ale jeszcze niepotwierdzony (stary działa do potwierdzenia).
-- user_tokens             — jednorazowe linki z maili: potwierdzenie adresu (email_verify) i reset
--                           hasła (password_reset). W bazie WYŁĄCZNIE sha256 tokenu.
--
-- Adresy wpisane wcześniej (sekcja "Moje konto") są uznawane za potwierdzone — te konta nic nie
-- muszą robić. Blokada działa tylko przy ADMIN_AUTH_ENABLED=true i skonfigurowanym SMTP
-- (SMTP_HOST, SMTP_FROM) — bez poczty nikt nie dostałby linku i panel byłby zamknięty dla wszystkich.
--
-- Uruchom RAZ (ALTER TABLE ... ADD COLUMN nie jest powtarzalne).
-- =============================================================================

ALTER TABLE users
  ADD COLUMN email_verified_at TIMESTAMP NULL DEFAULT NULL AFTER email,
  ADD COLUMN pending_email VARCHAR(190) NULL DEFAULT NULL AFTER email_verified_at;

UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE email IS NOT NULL AND email_verified_at IS NULL;

CREATE TABLE IF NOT EXISTS user_tokens (
  id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED  NOT NULL,
  purpose     VARCHAR(32)      NOT NULL,
  token_hash  CHAR(64)         NOT NULL,
  email       VARCHAR(190)     NULL,
  created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  TIMESTAMP        NOT NULL,
  used_at     TIMESTAMP        NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_tokens_hash (token_hash),
  KEY ix_user_tokens_user (user_id, purpose, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
