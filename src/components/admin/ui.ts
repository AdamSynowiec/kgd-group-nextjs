/**
 * Wspólny język wizualny panelu (klasy Tailwind) — jedno miejsce zamiast tych
 * samych długich stringów w każdym komponencie. Neutralna skala zinc + akcent
 * indigo (fokus, aktywna nawigacja), zaokrąglenia lg/xl, delikatne cienie.
 */
export const ui = {
  input:
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-[0_1px_2px_rgba(16,24,40,0.04)] outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400",
  label: "mb-1.5 block text-[13px] font-medium text-zinc-700",
  hint: "mt-1.5 text-xs text-zinc-500",

  btnPrimary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-[0_1px_2px_rgba(16,24,40,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-900/15 disabled:cursor-not-allowed disabled:opacity-50",
  btnSecondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-50",
  // Małe warianty (osobne stringi — nadpisywanie paddingu klasą obok nie działa pewnie w Tailwind).
  btnPrimarySm:
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-[0_1px_2px_rgba(16,24,40,0.12)] transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50",
  btnSecondarySm:
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-700 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50",
  btnGhost:
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50",
  btnDanger:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40",
  iconBtn:
    "inline-grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40",

  card: "rounded-xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
  cardHeader: "flex items-center justify-between gap-4 border-b border-zinc-100 px-5 py-4",

  badge: "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
  badgeSuccess: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  badgeWarning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  badgeNeutral: "bg-zinc-50 text-zinc-600 ring-zinc-500/15",

  alertError: "rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700",
  alertSuccess: "rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700",
} as const;
