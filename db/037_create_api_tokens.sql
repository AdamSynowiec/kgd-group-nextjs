-- =============================================================================
-- 037: REST API v1 — tokeny dostępu (panel: Ustawienia → Tokeny API)
-- =============================================================================
-- api_tokens       — token widoczny tylko raz, przy utworzeniu; w bazie WYŁĄCZNIE jego sha256
--                    (token_hash) i pierwsze znaki (prefix) do rozpoznania na liście.
--                    scopes: JSON lista zakresów, np. ["pages:read"]. revoked_at / expires_at —
--                    token przestaje działać od razu po cofnięciu albo po dacie wygaśnięcia.
-- api_rate_limits  — licznik zapytań tokenu w bieżącym oknie (limit: backend/src/Api/RateLimiter.php).
--
-- Uprawnienie panelu api.tokens.manage (tworzenie / cofanie tokenów): rola "admin" ma je
-- automatycznie ('*'), innym rolom można je nadać w panelu Uprawnień.
-- Nic poza tym nie jest zmieniane. Można uruchomić wielokrotnie.
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_tokens (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(120)    NOT NULL,
  prefix        VARCHAR(16)     NOT NULL,
  token_hash    CHAR(64)        NOT NULL,
  scopes        JSON            NOT NULL,
  created_by    VARCHAR(190)    NULL,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at    TIMESTAMP       NULL DEFAULT NULL,
  last_used_at  TIMESTAMP       NULL DEFAULT NULL,
  revoked_at    TIMESTAMP       NULL DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_api_tokens_hash (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_rate_limits (
  token_id      BIGINT UNSIGNED NOT NULL,
  window_start  INT UNSIGNED    NOT NULL,
  hits          INT UNSIGNED    NOT NULL DEFAULT 0,
  PRIMARY KEY (token_id, window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
