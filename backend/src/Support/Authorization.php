<?php

declare(strict_types=1);

namespace App\Support;

use App\Exception\ApiException;
use App\Repository\PermissionRepositoryInterface;
use App\Repository\UserRepositoryInterface;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * JEDYNA bramka operacyjnych uprawnień panelu /admin — zastępuje wszystkie
 * dotychczasowe SessionAuth::requireRole($session, 'admin') poza dwoma
 * wyjątkami (patrz niżej). Wołana raz na trasę, w closure w admin.php,
 * dokładnie tam, gdzie wcześniej było requireRole() — patrz README migracji
 * w db/011_create_permission_tables.sql.
 *
 * WYJĄTEK: /build i /build/status ZOSTAJĄ na starym, bezbazowym
 * SessionAuth::requireRole('admin') na stałe (patrz SessionAuth.php) — te
 * dwie trasy muszą działać nawet gdy baza nie odpowiada (odzyskiwanie po
 * awarii), a require() poniżej z definicji potrzebuje bazy przy każdym
 * wywołaniu.
 *
 * Token sesji NIGDY nie jest źródłem prawdy o roli tutaj — bakuje ją tylko
 * przy loginie i nie odświeża się bez ponownego zalogowania (patrz
 * SessionToken.php, TTL 7 dni). require() zawsze pobiera AKTUALNĄ rolę z
 * bazy po userId z tokenu, więc zmiana roli albo nowy wpis "deny" działa od
 * następnego żądania, nie od następnego logowania. Zwrócona świeża rola jest
 * też przekazywana dalej do AdminController, żeby ACL treści strona/pole
 * (Acl::canRead/canWrite, EditableMerge::apply) korzystało z tej samej,
 * świeżej wartości zamiast z nieaktualnej roli w tokenie.
 */
final class Authorization
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
        private readonly PermissionRepositoryInterface $permissions
    ) {
    }

    /**
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     * @return string|null Świeża rola wołającego z bazy; null tylko gdy uwierzytelnianie
     *   panelu jest wyłączone (ADMIN_AUTH_ENABLED=false) — wtedy, tak jak
     *   SessionAuth::requireRole(), nic nie blokuje.
     */
    public function require(?array $currentSession, string $permission): ?string
    {
        if ($currentSession === null) {
            return null;
        }

        $user = $this->users->findById($currentSession['userId']);
        if ($user === null) {
            throw new ApiException('Sesja nieważna — zaloguj się ponownie.', 401);
        }

        if (!$this->permissions->effectiveHas($user['id'], $user['role'], $permission)) {
            throw new ApiException('Brak uprawnień do tej operacji.', 403);
        }

        return $user['role'];
    }
}
