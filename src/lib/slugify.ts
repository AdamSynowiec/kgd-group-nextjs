/**
 * Tekst -> kebab-case zgodny z backend/src/Support/Slug.php::ALLOWED_SEGMENT
 * (`[a-z0-9]+(-[a-z0-9]+)*`) — bez tego polskie znaki (ą, ć, ę...) w
 * tytule dawałyby slug odrzucany przez backend. Ogólne narzędzie, nie
 * specyficzne dla kolekcji — każdy przyszły "utwórz z tytułu" może go użyć.
 */
const POLISH_DIACRITICS: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z",
  Ą: "a", Ć: "c", Ę: "e", Ł: "l", Ń: "n", Ó: "o", Ś: "s", Ź: "z", Ż: "z",
};

export function slugify(text: string): string {
  const transliterated = text.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (ch) => POLISH_DIACRITICS[ch] ?? ch);

  return transliterated
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // pozostałe znaki diakrytyczne (inne alfabety łacińskie)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
