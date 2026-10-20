"use client";

import { useState } from "react";
import { AdminApiError, updateOwnAccount, type Session } from "@/lib/adminApi";
import { ui } from "@/components/admin/ui";

const inputClass = ui.input;

/**
 * Samoobsługowa zmiana WŁASNEGO adresu email i/lub hasła — patrz
 * UsersController::updateOwnAccount(). Widoczna dla KAŻDEGO zalogowanego,
 * bez względu na rolę/uprawnienia (to nie operacja na cudzych danych, patrz
 * db/012_add_user_email.sql) — w odróżnieniu od Kont/Ról/Uprawnień niżej,
 * ta sekcja nie jest owinięta w <Can>.
 */
export default function MyAccountPanel({ session, onUpdated }: { session: Session | null; onUpdated: (email: string | null) => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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
      const updated = await updateOwnAccount(
        {
          currentPassword,
          ...(wantsEmailChange ? { email: email.trim() } : {}),
          ...(wantsPasswordChange ? { newPassword } : {}),
        },
        session
      );
      onUpdated(updated.email);
      setCurrentPassword("");
      setEmail("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Zapisano zmiany.");
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
