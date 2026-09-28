-- =============================================================================
-- Migracja 020 -- limit zgłoszeń z formularzy kontaktowych (POST /contact,
-- POST /quick-contact w backend/index.php, patrz ContactController.php).
--
-- Tylko do ograniczenia spamu (max kilka zgłoszeń z jednego IP w 10 minut):
-- zapisywany jest SKRÓT adresu IP (sha256 z solą), rodzaj formularza i czas —
-- bez treści zgłoszenia i bez danych osobowych. Wpisy starsze niż doba są
-- kasowane automatycznie przy kolejnych zgłoszeniach.
-- =============================================================================

CREATE TABLE IF NOT EXISTS contact_submissions (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kind       VARCHAR(20)     NOT NULL,
  ip_hash    CHAR(64)        NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contact_submissions_ip (ip_hash, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
