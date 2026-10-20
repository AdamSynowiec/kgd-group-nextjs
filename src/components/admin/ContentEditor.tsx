"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import EditableField, { fieldSections } from "@/components/admin/EditableField";
import Can from "@/components/admin/Can";
import { ArrowLeftIcon, CheckIcon } from "@/components/admin/icons";
import { ui } from "@/components/admin/ui";
import { deepSet } from "@/lib/deepSet";
import { can } from "@/lib/permissions";
import { unwrap, type EditableValue } from "@/lib/editable";
import type { Session } from "@/lib/adminApi";

type SaveState = "idle" | "saving" | "success" | "error";

/**
 * Rdzeń edycji DOWOLNEJ treści w konwencji {value,editable,label,type}
 * (patrz src/lib/editable.ts) — stan lokalny + EditableField + przycisk
 * zapisu. Nie wie NIC o tym, dokąd zapis trafia — to `onSave` decyduje;
 * PageEditor.tsx (jedyny dziś wrapper — strony i wpisy bloga to od refaktoru
 * ten sam mechanizm, patrz src/lib/pageTemplates.ts) woła przez nią zapis do
 * `pages`.
 *
 * Układ: przyklejony pasek (powrót, tytuł, stan zmian, zapis), pola w kartach
 * sekcji, a obok (od xl) panel z kontrolkami publikacji i spisem sekcji.
 * Ctrl/⌘+S zapisuje; wyjście z niezapisanymi zmianami pyta o potwierdzenie.
 */
export default function ContentEditor({
  backLabel,
  titleLabel,
  initialContent,
  session,
  onBack,
  onSave,
  beforeFields,
  extraDirty = false,
}: {
  /** Tekst linku powrotu, np. "Wszystkie strony". */
  backLabel: string;
  /** Podpis pod tytułem — dziś zawsze slug. */
  titleLabel: string;
  initialContent: Record<string, unknown>;
  session: Session | null;
  onBack: () => void;
  /** Rzuca na błąd (np. AdminApiError) — ContentEditor sam zamienia to na komunikat. */
  onSave: (content: Record<string, unknown>) => Promise<unknown>;
  /** Dodatkowe kontrolki publikacji (np. status/data w PageEditor.tsx) — w panelu bocznym. */
  beforeFields?: ReactNode;
  /** Niezapisane zmiany poza polami treści (np. status/data w PageEditor.tsx). */
  extraDirty?: boolean;
}) {
  const [content, setContent] = useState(initialContent);
  const [contentDirty, setContentDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const dirty = contentDirty || extraDirty;
  const canSave = can(session?.permissions, "pages.update");

  const sections = useMemo(() => fieldSections(content, session?.role), [content, session?.role]);
  const title = unwrap(content.title as EditableValue<string> | string | undefined) || titleLabel;

  function handleChange(path: (string | number)[], value: unknown) {
    setContent((prev) => deepSet(prev, path, value));
    setContentDirty(true);
    setSaveState("idle");
  }

  async function handleSave() {
    if (saveState === "saving") return;
    setSaveState("saving");
    setErrorMessage("");
    try {
      await onSave(content);
      setContentDirty(false);
      setSaveState("success");
    } catch (error) {
      setSaveState("error");
      setErrorMessage(error instanceof Error ? error.message : "Nieznany błąd.");
    }
  }

  // Ctrl/⌘+S i ostrzeżenie przy zamykaniu karty — ref zamiast zależności, żeby nasłuch był jeden.
  const saveRef = useRef(handleSave);
  useEffect(() => {
    saveRef.current = handleSave;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (canSave) void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canSave]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function handleBack() {
    if (dirty && !window.confirm("Masz niezapisane zmiany. Wyjść bez zapisywania?")) return;
    onBack();
  }

  function toggleSection(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function jumpTo(id: string) {
    setCollapsed((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const allCollapsed = sections.length > 0 && sections.every((section) => collapsed.has(section.id));

  return (
    <div>
      {/* Przyklejony pasek edytora — pod paskiem panelu (h-16) */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-zinc-200/80 bg-zinc-50/85 px-4 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3">
          <button
            onClick={handleBack}
            title={backLabel}
            aria-label={backLabel}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-semibold tracking-tight text-zinc-900">{title}</div>
            <div className="truncate font-mono text-[11px] text-zinc-500">{titleLabel}</div>
          </div>

          <div className="hidden items-center sm:flex">
            {saveState === "error" ? (
              <span className={`${ui.badge} bg-red-50 text-red-700 ring-red-600/15 max-w-xs truncate`} title={errorMessage}>
                {errorMessage || "Błąd zapisu"}
              </span>
            ) : dirty ? (
              <span className={`${ui.badge} ${ui.badgeWarning}`}>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Niezapisane zmiany
              </span>
            ) : saveState === "success" ? (
              <span className={`${ui.badge} ${ui.badgeSuccess}`}>
                <CheckIcon className="h-3 w-3" />
                Zapisano
              </span>
            ) : null}
          </div>

          <Can session={session} permission="pages.update">
            <button onClick={handleSave} disabled={saveState === "saving"} className={`${ui.btnPrimary} shrink-0`}>
              {saveState === "saving" ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Zapisywanie…
                </>
              ) : (
                <>
                  Zapisz zmiany
                  <kbd className="hidden rounded border border-white/15 bg-white/10 px-1.5 font-sans text-[10px] font-medium text-zinc-300 md:inline">Ctrl S</kbd>
                </>
              )}
            </button>
          </Can>
        </div>
        {saveState === "error" && <p className="mx-auto mt-2 max-w-[1400px] text-sm text-red-600 sm:hidden">{errorMessage}</p>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {beforeFields && <div className="mb-4 xl:hidden">{beforeFields}</div>}
          <EditableField node={content} session={session} onChange={handleChange} collapsed={collapsed} onToggleSection={toggleSection} />
        </div>

        <aside className="hidden xl:block">
          <div className="sticky top-36 space-y-4">
            {beforeFields}

            {sections.length > 1 && (
              <nav className={`${ui.card} p-2`} aria-label="Sekcje strony">
                <div className="flex items-center justify-between px-2.5 pb-2 pt-1.5">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Sekcje</span>
                  <button
                    type="button"
                    onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(sections.map((section) => section.id)))}
                    className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900"
                  >
                    {allCollapsed ? "Rozwiń wszystkie" : "Zwiń wszystkie"}
                  </button>
                </div>
                <ol className="max-h-[calc(100vh-24rem)] space-y-0.5 overflow-y-auto">
                  {sections.map((section, index) => (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => jumpTo(section.id)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <span className="w-5 shrink-0 text-right text-[11px] tabular-nums text-zinc-400">{index + 1}</span>
                        <span className={`min-w-0 flex-1 truncate ${collapsed.has(section.id) ? "text-zinc-400" : ""}`}>{section.label}</span>
                        <span className="shrink-0 text-[11px] tabular-nums text-zinc-400">{section.fields.length}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
