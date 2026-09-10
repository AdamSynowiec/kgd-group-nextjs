-- =============================================================================
-- Migracja 007 — tabela `collection_items`: uniwersalny magazyn "kolekcji"
-- (treści powtarzalnej, jak blog), OSOBNY od `pages` (patrz db/schema.sql).
--
-- Dlaczego nie `pages`: `pages` to jeden wiersz = jedna, ręcznie budowana
-- strona z `sections[]`, bez tworzenia/usuwania z panelu (MysqlPageRepository::save()
-- to wyłącznie UPDATE) i bez indeksowanych kolumn do sortowania/paginacji
-- (status żyje w JSON-ie). Kolekcja z natury potrzebuje obu — 200+ wpisów
-- bloga, dodawanych z panelu, listowanych z sortowaniem po dacie.
--
-- "collection" to dyskryminator (np. "blog") — jedna tabela obsługuje dowolną
-- liczbę PRZYSZŁYCH kolekcji (np. "realizacje", "zespol") bez nowej migracji:
-- nowa kolekcja to nowy wpis w src/lib/collections/registry.ts + nowy szablon
-- publiczny, nie nowa tabela.
--
-- "content" ma DOKŁADNIE ten sam kształt co pages.content — węzły
-- {value, editable, label, type} (patrz src/lib/editable.ts, src/lib/fieldType.ts)
-- — cały istniejący silnik panelu (Editable.php, EditableMerge.php, rejestr
-- edytorów w src/components/admin/fields/) działa tu bez żadnej zmiany.
--
-- "status"/"published_at" są PRAWDZIWYMI kolumnami (nie polami w JSON-ie) —
-- to jest to, czego `pages` nie ma, i to jest wymagane pod indeksowaną
-- paginację (ORDER BY published_at LIMIT/OFFSET zamiast JSON_EXTRACT po
-- każdym wierszu).
-- =============================================================================

CREATE TABLE IF NOT EXISTS collection_items (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  collection   VARCHAR(64)     NOT NULL,
  slug         VARCHAR(255)    NOT NULL,
  content      JSON            NOT NULL,
  status       VARCHAR(16)     NOT NULL DEFAULT 'draft',
  published_at DATETIME        NULL,
  created_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_collection_slug (collection, slug),
  KEY idx_collection_list (collection, status, published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
