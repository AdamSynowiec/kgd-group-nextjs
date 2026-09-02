<?php

declare(strict_types=1);

namespace App\Controller;

use App\Exception\ApiException;
use App\Exception\NotFoundException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\UserRepositoryInterface;
use JsonException;
use PDOException;

if (!defined('APP_ENTRY')) {
    http_response_code(403);
    exit;
}

/**
 * Zarządzanie kontami panelu (sekcja "Ustawienia" w /admin) — dodawanie i
 * usuwanie użytkowników. Wszystkie trasy wymagają roli "admin" (patrz
 * admin.php: SessionAuth::requireRole($session, 'admin') przed wywołaniem
 * którejkolwiek metody tego kontrolera) — sam kontroler i tak dodatkowo
 * pilnuje dwóch rzeczy, których żadna rola nie powinna móc zrobić przez
 * pomyłkę: usunięcia własnego konta i usunięcia ostatniego konta "admin"
 * (co zablokowałoby dostęp do panelu dla wszystkich).
 */
final class UsersController
{
    public function __construct(private readonly UserRepositoryInterface $users)
    {
    }

    /** GET /users — lista kont (bez hasła) pod panel ustawień. */
    public function listUsers(): void
    {
        JsonResponse::ok($this->users->listAll());
    }

    /** POST /users, body: {"login": "...", "password": "...", "role": "admin"|"editor"} */
    public function createUser(Request $request): void
    {
        try {
            $body = $request->jsonBody();
        } catch (JsonException) {
            throw new ApiException('Niepoprawny JSON.', 400);
        }

        $login = is_string($body['login'] ?? null) ? trim($body['login']) : '';
        $password = $body['password'] ?? null;
        $role = $body['role'] ?? 'editor';

        if ($login === '') {
            throw new ApiException('Podaj login.', 400);
        }

        if (!is_string($password) || mb_strlen($password) < 8) {
            throw new ApiException('Hasło musi mieć co najmniej 8 znaków.', 400);
        }

        if (!in_array($role, ['admin', 'editor'], true)) {
            throw new ApiException('Rola musi być "admin" albo "editor".', 400);
        }

        try {
            $user = $this->users->create($login, password_hash($password, PASSWORD_DEFAULT), $role);
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                throw new ApiException('Ten login jest już zajęty.', 409);
            }

            throw $exception;
        }

        JsonResponse::ok($user);
    }

    /**
     * DELETE /users?id=... — usuwa konto. $currentSession jest null tylko
     * wtedy, gdy uwierzytelnianie panelu jest wyłączone (ADMIN_AUTH_ENABLED=false)
     * — w tym trybie nie ma tożsamości, więc strażnik "nie usuwaj samego siebie"
     * nie ma czego pilnować.
     *
     * @param array{userId: int, login: string, role: string, exp: int}|null $currentSession
     */
    public function deleteUser(Request $request, ?array $currentSession): void
    {
        $id = $this->idFromQuery($request);
        $target = $this->users->findById($id);

        if ($target === null) {
            throw new NotFoundException("Nie znaleziono konta o id {$id}.");
        }

        if ($currentSession !== null && $currentSession['userId'] === $id) {
            throw new ApiException('Nie możesz usunąć własnego konta.', 400);
        }

        if ($target['role'] === 'admin' && $this->users->countAdmins() <= 1) {
            throw new ApiException('Nie można usunąć ostatniego konta z rolą "admin".', 400);
        }

        $this->users->delete($id);

        JsonResponse::ok(['deleted' => true, 'id' => $id]);
    }

    private function idFromQuery(Request $request): int
    {
        $raw = $request->query['id'] ?? null;

        if (!is_string($raw) || !ctype_digit($raw)) {
            throw new ApiException('Brak lub nieprawidłowy parametr "id".', 400);
        }

        return (int) $raw;
    }
}
