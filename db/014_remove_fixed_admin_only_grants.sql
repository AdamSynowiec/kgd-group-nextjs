-- =============================================================================
-- Migracja 014 -- sprząta wiersze role_permissions dla "build.trigger" i
-- "build.status", które dało się zapisać dowolnej roli PRZED tą migracją
-- (błąd: panel Uprawnień pozwalał zaznaczyć/zapisać te dwa checkboxy dla
-- np. roli "blog", mimo że backend i tak zawsze wymaga tam wprost roli
-- "admin" — patrz SessionAuth::requireRole('admin') w admin.php, komentarz
-- przy PermissionRegistry::FIXED_ADMIN_ONLY). Zaznaczony checkbox nie miał
-- więc ŻADNEGO efektu poza mylącym stanem w bazie — stąd "Brak uprawnień"
-- przy /build mimo zaznaczonej zgody w panelu.
--
-- Od tej migracji PermissionsController::updateRolePermissions() odrzuca
-- próbę zapisania tych dwóch uprawnień dla jakiejkolwiek roli (400), więc
-- się to więcej nie powtórzy — ta migracja czyści tylko to, co już zdążyło
-- się zapisać wcześniej.
--
-- Uruchom ręcznie, np.: mysql -u UZYTKOWNIK -p NAZWA_BAZY < db/014_remove_fixed_admin_only_grants.sql
-- =============================================================================

DELETE FROM role_permissions WHERE permission IN ('build.trigger', 'build.status');
