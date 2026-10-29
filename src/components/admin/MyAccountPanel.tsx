"use client";

import { useEffect, useState } from "react";
import { AdminApiError, fetchAccountEmail, requestEmailVerification, updateOwnAccount, type AccountEmailStatus, type Session } from "@/lib/adminApi";
import { ui } from "@/components/admin/ui";

const inputClass = ui.input;

/**
 * Samoobsługowa zmiana WŁASNEGO adresu email i/lub hasła — patrz
 * UsersController::updateOwnAccount(). Widoczna dla KAŻDEGO zalogowanego,
 * bez względu na rolę/uprawnienia (to nie operacja na cudzych danych, patrz
 * db/012_add_user_email.sql) — w odróżnieniu od Kont/Ról/Uprawnień niżej,
 * ta sekcja nie jest owinięta w <Can>.
 *
 * Nowy adres e-mail nie zapisuje się od razu — idzie na niego link potwierdzający
 * (AccountController::requestEmail()), a obecny adres działa do czasu potwierdzenia.
 */
export default function MyAccountPanel({ session }: { session: Session | null }) {
  const [account, setAccount] = useState<AccountEmailStatus | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchAccountEmail(session)
      .then((result) => !cancelled && setAccount(result))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [session]);

  const wantsEmailChange = email.trim() !== "";
  const wantsPasswordChange = newPassword !== "" || confirmPassword !== "";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!wantsEmailChange && !wantsPasswordChange) {
      setErrorMessage("Podaj nowy adres email lub nowe hasło.");
      return;
    }

    if (wantsPasswordChange && newPassword !== confirmPassword) {
      setErrorMessage("Powtórzone hasło nie zgadza się z nowym hasłem.");
      return;
    }

    setSubmitting(true);
    try {
      const messages: string[] = [];
      // Najpierw adres — po zmianie hasła obecne hasło (wymagane przy adresie) przestałoby pasować.
      if (wantsEmailChange) {
        const status = await requestEmailVerification({ email: email.trim(), currentPassword }, session);
        setAccount(status);
        setEmail("");
        messages.push(`Wysłaliśmy link potwierdzający na ${status.pendingEmail} — adres zmieni się po jego kliknięciu.`);
      }
      if (wantsPasswordChange) {
        await updateOwnAccount({ currentPassword, newPassword }, session);
        setNewPassword("");
        setConfirmPassword("");
        messages.push("Hasło zostało zmienione.");
      }
      setCurrentPassword("");
      setSuccessMessage(messages.join(" "));
    } catch (error) {
      setErrorMessage(error instanceof AdminApiError ? error.message : error instanceof Error ? error.message : "Nieznany błąd.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${ui.card} space-y-4 p-6`}>
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Moje konto</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Zalogowano jako <span className="font-medium text-zinc-700">{session?.login ?? "—"}</span>. Zmień swój adres email i/lub
          hasło — każda zmiana wymaga podania obecnego hasła.
        </p>
        {account && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
            Adres: <span className="font-medium text-zinc-900">{account.email ?? "—"}</span>
            {account.email && account.emailVerified && <span className={`${ui.badge} ${ui.badgeSuccess}`}>potwierdzony</span>}
            {account.pendingEmail && (
              <span className={`${ui.badge} ${ui.badgeWarning}`}>czeka na potwierdzenie: {account.pendingEmail}</span>
            )}
          </p>
        )}
      </div>

      {errorMessage && <p className={ui.alertError}>{errorMessage}</p>}
      {successMessage && <p className={ui.alertSuccess}>{successMessage}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={ui.label}>Nowy adres email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
            placeholder="pozostaw puste, aby nie zmieniać"
            className={inputClass}
          />
        </div>
        <div />
        <div>
          <label className={ui.label}>Nowe hasło</label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={submitting}
            placeholder="pozostaw puste, aby nie zmieniać"
            className={inputClass}
          />
          <p className="mt-1 text-xs text-zinc-400">min. 8 znaków</p>
        </div>
        <div>
          <label className={ui.label}>Powtórz nowe hasło</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={submitting}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={ui.label}>Obecne hasło (wymagane)</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={submitting}
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || currentPassword === ""}
        className={ui.btnPrimary}
      >
        {submitting ? "Zapisywanie..." : "Zapisz zmiany"}
      </button>
    </form>
  );
}
