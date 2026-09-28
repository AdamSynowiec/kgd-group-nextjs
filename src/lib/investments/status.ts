/**
 * Zasada: sprzedanych lokali NIE pokazujemy na stronie (ani w tabeli oferty,
 * ani na mapie/rzucie). Dane zostają w bazie — w panelu /admin wystarczy
 * ustawić status "Sprzedany" (lub "Sprzedane"/"Sprzedana"), a lokal zniknie
 * po kolejnym buildzie. Rezerwacje nadal są widoczne (bez ceny).
 */
export function isSold(status: string | null | undefined): boolean {
  return /^sprzedan/i.test((status ?? "").trim());
}

export function withoutSold<T extends { status?: string | null }>(items: T[]): T[] {
  return items.filter((item) => !isSold(item.status));
}
