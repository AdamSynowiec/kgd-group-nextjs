-- =============================================================================
-- Migracja 010 -- tabela `roles`: role dostępne do przypisania kontom
-- (users.role, patrz db/005_create_users_table.sql) i do ACL stron/pól
-- (acl.role, patrz db/009_add_page_acl.sql).
--
-- Każda rola ma:
--   - "name"  — techniczną nazwę, PRIMARY KEY, NIGDY się nie zmienia po
--               utworzeniu (na niej opiera się każde porównanie w
--               Acl::check() i users.role) — panel /admin/settings pozwala
--               ją utworzyć i usunąć, ale nie edytować.
--   - "label" — czytelną nazwę do wyświetlenia w panelu (np. "Marketing —
--               treść kampanii").
--
-- Rola "admin" jest zaszyta w wielu miejscach kodu (SessionAuth::requireRole,
-- Acl::check — zawsze przechodzi każdy check) — RolesController blokuje jej
-- usunięcie na stałe. "editor"/"blog" to role używane już dziś (patrz db/005,
-- db/009) — zasiane tutaj, żeby panel miał od razu z czego wybierać, ale nie
-- są chronione przed usunięciem tak jak "admin" (o ile żadne konto ich nie
-- używa — patrz RolesController::deleteRole()).
--
-- users.role / acl.role NIE mają twardego klucza obcego do roles.name (JSON
-- w pages.content i tak nie mógłby go mieć) — RolesController po prostu
-- odmawia usunięcia roli, dopóki jakiekolwiek konto jej używa; strony z acl
-- wskazującym na już usuniętą rolę po prostu stają się niedostępne dla
-- nikogo poza adminem, do naprawy ręcznie.
--
-- Uruchom ręcznie, np.: mysql -u UZYTKOWNIK -p NAZWA_BAZY < db/010_create_roles_table.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS roles (
  name       VARCHAR(50)  NOT NULL,
  label      VARCHAR(100) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (name, label) VALUES
  ('admin', 'Admin — treść + build + konta'),
  ('editor', 'Edytor — treść stron'),
  ('blog', 'Blog — tylko wpisy bloga')
ON DUPLICATE KEY UPDATE label = VALUES(label);
