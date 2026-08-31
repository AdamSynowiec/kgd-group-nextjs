-- =============================================================================
-- KGD Group — magazyn treści podstron (MySQL / MariaDB)
-- =============================================================================
--
-- Zamiennik warstwy plikowej src/data/pages/**.json opisanej w src/lib/content.ts.
-- Ten plik NIE jest uruchamiany automatycznie — to wyłącznie definicja struktury
-- do ręcznego importu (np. `mysql nazwa_bazy < db/schema.sql` albo phpMyAdmin).
--
-- Konwencja "slug → routing → pliki statyczne" (bez zmian względem silnika
-- plikowego):
--   * slug jest zapisany dokładnie tak, jak zwraca normalizeSlug() w
--     src/lib/content.ts — zaczyna się od "/", bez końcowego "/" (wyjątek:
--     strona główna to literalnie "/").
--   * przy generowaniu builda slug dzieli się na segmenty po "/" (patrz
--     slugToSegments()) — każdy segment to jeden poziom katalogów:
--       "/"                              -> out/index.html
--       "/o-nas"                         -> out/o-nas.html
--       "/rozwiazania/dane-w-jednym-miejscu" -> out/rozwiazania/dane-w-jednym-miejscu.html
--     Ten sam podział napędza dziś generateStaticParams() w
--     src/app/[...slug]/page.tsx (który zamienia segmenty na katalogi Next.js)
--     — po podłączeniu bazy zamiast fs.readdirSync wystarczy, że zapyta o
--     wszystkie wiersze `pages` i zbuduje z nich tę samą listę parametrów.
--   * kolumna "slug" jest jedynym źródłem prawdy o adresie — nic w kolumnie
--     "content" nie powinno z nią być sprzeczne (pole "slug" wewnątrz JSON-a
--     zostaje z tych samych powodów co dziś w pliku: żeby dokument JSON był
--     samodzielny i czytelny bez joina).
--
-- =============================================================================

-- Odkomentuj i podmień nazwę, jeśli baza ma powstać w tym samym poleceniu:
-- CREATE DATABASE IF NOT EXISTS kgd_group CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE kgd_group;

-- -----------------------------------------------------------------------------
-- Tabela: pages
-- -----------------------------------------------------------------------------
-- id      — klucz sztuczny, bez znaczenia biznesowego.
-- slug    — adres podstrony; UNIQUE, bo dwie strony nie mogą dzielić jednego URL-a.
-- content — cała treść strony jako jeden dokument JSON (nav, seo, sections, ...),
--           dokładnie w kształcie dzisiejszych plików src/data/pages/*.json.
--           Typ JSON waliduje składnię przy zapisie (MySQL 5.7.8+/MariaDB 10.2+).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pages (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug       VARCHAR(255)    NOT NULL,
  content    JSON            NOT NULL,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pages_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Dane przykładowe — dokładna migracja obecnych src/data/pages/home.json
-- i src/data/pages/o-nas.json, żeby ten plik dało się od razu zaimportować
-- i porównać z wersją plikową.
-- -----------------------------------------------------------------------------

INSERT INTO pages (slug, content) VALUES
  ('/', '{"slug":"/","parent":null,"template":"home","title":"Strona główna","updatedAt":"2026-08-31","status":"published","nav":{"label":"Strona główna","order":1},"seo":{"title":"KGD Group — strona główna","description":"Przykładowa strona główna zbudowana z pliku JSON w src/data/pages/home.json.","keywords":["kgd group","strona firmowa","next.js"],"canonical":null,"robots":{"index":true,"follow":true},"author":"KGD Group","ogTitle":null,"ogDescription":null,"ogImage":null,"ogType":"website","ogUrl":null,"ogSiteName":"KGD Group","ogLocale":"pl_PL","twitterCard":"summary_large_image","twitterTitle":null,"twitterDescription":null,"twitterImage":null,"language":"pl","structuredData":[{"type":"WebPage"}]},"sections":[{"id":"hero-home","component":"Hero","fields":{"eyebrow":"KGD Group","heading":"Tytuł strony głównej","lead":"To jest przykładowa treść wygenerowana z pliku src/data/pages/home.json. Podmień pola w JSON-ie, żeby zmienić stronę.","primaryCta":{"label":"O nas","href":"/o-nas"}}},{"id":"o-firmie","component":"RichText","fields":{"heading":"O firmie","blocks":[{"type":"paragraph","text":"Ta sekcja pochodzi z komponentu RichText i pola \\"blocks\\" w JSON-ie. Każdy blok ma typ (paragraph, heading, list) i jest renderowany semantycznie."},{"type":"list","style":"bullet","items":["Nowa podstrona = nowy plik JSON w src/data/pages/","Nowy typ sekcji = nowy komponent zarejestrowany w src/lib/sections.tsx"]}]}}],"related":{"mode":"auto"}}'),
  ('/o-nas', '{"slug":"/o-nas","parent":"/","template":"about","title":"O nas","updatedAt":"2026-08-31","status":"published","nav":{"label":"O nas","order":2,"summary":"Kim jest KGD Group i jak dodawać kolejne podstrony."},"seo":{"title":"O nas — KGD Group","description":"Przykładowa podstrona pokazująca, że wystarczy dodać plik JSON w src/data/pages, żeby powstał nowy adres.","keywords":["o nas","kgd group"],"canonical":null,"robots":{"index":true,"follow":true},"author":"KGD Group","ogTitle":null,"ogDescription":null,"ogImage":null,"ogType":"website","ogUrl":null,"ogSiteName":"KGD Group","ogLocale":"pl_PL","twitterCard":"summary_large_image","twitterTitle":null,"twitterDescription":null,"twitterImage":null,"language":"pl","structuredData":[{"type":"BreadcrumbList","from":"parent"},{"type":"WebPage"},{"type":"FAQPage","from":"section:faq-o-nas"}]},"sections":[{"id":"hero-o-nas","component":"Hero","fields":{"eyebrow":"O nas","heading":"Ta strona to plik src/data/pages/o-nas.json","lead":"Ścieżka pliku odpowiada adresowi: o-nas.json → /o-nas. Zagnieżdżony katalog, np. o-nas/zespol.json, dałby /o-nas/zespol."}},{"id":"tresc-o-nas","component":"RichText","fields":{"heading":"Jak dodać kolejną podstronę","blocks":[{"type":"paragraph","text":"Skopiuj ten plik pod nową nazwą, zmień pole \\"slug\\" i uzupełnij sekcje. Router (src/app/[...slug]/page.tsx) wykryje go automatycznie przy kolejnym buildzie — nic więcej nie trzeba zmieniać."},{"type":"list","style":"number","items":["Utwórz plik JSON w src/data/pages/","Ustaw unikalny \\"slug\\" i opcjonalnie \\"parent\\"","Dodaj sekcje z listy zarejestrowanej w src/lib/sections.tsx","Uruchom npm run build, żeby sprawdzić eksport statyczny"]}]}},{"id":"faq-o-nas","component":"FAQ","label":"FAQ (komponent jeszcze nie istnieje — sekcja nie wyrenderuje się wizualnie)","fields":{"heading":"Częste pytania","items":[{"question":"Czy sekcja musi mieć gotowy komponent, żeby zasilić SEO?","answer":"Nie. Dane strukturalne (JSON-LD) czytają pole \\"fields.items\\" bezpośrednio z tej sekcji, niezależnie od tego, czy komponent FAQ jest już zarejestrowany w src/lib/sections.tsx."},{"question":"Co się stanie, gdy komponent sekcji nie istnieje?","answer":"SectionRenderer zaloguje ostrzeżenie w konsoli builda i pominie tę sekcję wizualnie — reszta strony renderuje się normalnie."}]}}],"related":{"mode":"auto"}}');

-- -----------------------------------------------------------------------------
-- Przykładowe zapytania pod przyszły skrypt budujący (odpowiedniki funkcji
-- z src/lib/content.ts, gdyby czytały z bazy zamiast z fs):
-- -----------------------------------------------------------------------------

-- getAllPages() — wszystkie strony, tylko opublikowane (status w JSON-ie):
-- SELECT slug, content FROM pages WHERE JSON_EXTRACT(content, '$.status') = 'published';

-- getPageBySlug(slug) — jedna strona po adresie:
-- SELECT content FROM pages WHERE slug = '/o-nas';
