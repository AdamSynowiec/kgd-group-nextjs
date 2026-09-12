<?php

declare(strict_types=1);

namespace App\Support;

use App\Exception\ApiException;
use App\Http\SessionAuth;
use App\Repository\PermissionRepositoryInterface;
use App\Repository\UserRepositoryInterface;
use Throwable;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * JEDYNA bramka operacyjnych uprawnień panelu /admin — zastępuje wszystkie
 * dotychczasowe SessionAuth::requireRole($session, 'admin'). Wołana raz na
 * trasę, w closure w admin.php, dokładnie tam, gdzie wcześniej było
 * requireRole() — patrz README migracji w db/011_create_permission_tables.sql.
 *
 * /build i /build/status wołają requireResilient() zamiast require() (patrz
 * niżej) — poza tym każde uprawnienie, w tym "build.trigger"/"build.status",
 * jest tak samo elastyczne: admin może je nadać dowolnej roli w panelu
 * Uprawnień.
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

    /**
     * Wariant require() dla tras, które muszą przetrwać awarię bazy — dziś
     * tylko /build i /build/status (patrz admin.php, SessionAuth::requireRole()).
     * Najpierw próbuje zwykłego require(): w normalnej pracy uprawnienie
     * "build.trigger"/"build.status" działa więc tak samo elastycznie jak
     * każde inne (dowolna rola, jeśli admin jej to nada). Jeśli SAMO
     * zapytanie do bazy się wywali (baza nie odpowiada — nie mylić z legalną
     * odmową 401/403, którą trzeba przepuścić dalej), spada na stary,
     * bezbazowy SessionAuth::requireRole('admin'): w trakcie realnej awarii
     * odpali to więc już tylko rola "admin" z tokenu, ale przycisk
     * odzyskiwania po awarii przeżywa dokładnie tak, jak wcześniej.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function requireResilient(?array $currentSession, string $permission): void
    {
        try {
            $this->require($currentSession, $permission);
        } catch (ApiException $exception) {
            throw $exception;
        } catch (Throwable) {
            SessionAuth::requireRole($currentSession, 'admin');
        }
    }
}
