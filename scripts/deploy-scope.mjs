#!/usr/bin/env node
/**
 * Zakres deployu na FTP (krok "Deploy scope" w .github/workflows/deploy.yml) — wypisuje
 * ścieżki do POMINIĘCIA przy wgrywaniu (po jednej w linii; katalogi z "/" na końcu),
 * dla scripts/deploy-exclude.sh (pole INPUT_EXCLUDE). Pominięte = zostają na serwerze
 * w poprzedniej wersji (nie są ani wgrywane, ani kasowane).
 *
 *   SCOPE=pages        PAGES="/inwestycja/rudava-park,/"  tylko te strony (z podstronami)
 *   SCOPE=investments  tylko /inwestycja/**
 *   SCOPE=admin        tylko panel /admin i backend /api
 *   SCOPE=site | full | ""  nic nie pomija (blog wyklucza osobno SKIP_BLOG w deploy-exclude.sh)
 *
 * Zawsze wgrywane: _next/ (JS/CSS — nowe strony muszą mieć swoje pliki; stare zachowuje
 * krok "Keep previous static assets"), 404 / _not-found, pliki bez strony (obrazki z public/,
 * sitemap.xml, robots.txt…). Pomijane są tylko KATALOGI STRON (zawierające index.html)
 * spoza zakresu, pliki strony głównej (index.*, __next.*) gdy "/" nie jest w zakresie,
 * oraz api/ poza zakresem "admin".
 */
import fs from "node:fs";
import path from "node:path";

const OUT = process.env.OUT_DIR || "out";
const scope = (process.env.SCOPE || "").trim();
const pagesInput = (process.env.PAGES || "").trim();

function fail(message) {
  console.error(`::error::${message}`);
  process.exit(1);
}

/** "/inwestycja/rudava-park/" -> "inwestycja/rudava-park", "/" -> "" (strona główna). */
function slugToRel(slug) {
  const clean = slug.trim();
  if (!/^\/[a-z0-9/_-]*$/i.test(clean) || clean.includes("..") || clean.includes("//")) fail(`Niepoprawny adres strony: "${slug}".`);
  return clean.replace(/^\/+|\/+$/g, "");
}

let includes;
switch (scope) {
  case "":
  case "site":
  case "full":
    process.exit(0);
  case "pages": {
    const slugs = pagesInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (slugs.length === 0) fail('Zakres "pages" wymaga listy stron (PAGES).');
    includes = [...new Set(slugs.map(slugToRel))];
    for (const rel of includes) {
      if (rel !== "" && !fs.existsSync(path.join(OUT, rel, "index.html"))) {
        console.error(`::warning::Strony "/${rel}" nie ma w buildzie (usunięta albo szkic?) — pomijam ją w zakresie.`);
      }
    }
    break;
  }
  case "investments":
    includes = ["inwestycja"];
    break;
  case "admin":
    includes = ["admin", "api"];
    break;
  default:
    fail(`Nieznany zakres deployu: "${scope}".`);
}

if (!fs.existsSync(path.join(OUT, "index.html"))) fail(`Brak builda w ${OUT}/.`);

const ALWAYS = new Set(["_next", "404", "_not-found"]);
const PAGE_FILE = /^(index\.(html|txt)|__next\.)/;
const dirIncludes = includes.filter((rel) => rel !== "");

const isIncluded = (rel) => dirIncludes.some((inc) => rel === inc || rel.startsWith(`${inc}/`));
const isAncestor = (rel) => dirIncludes.some((inc) => inc.startsWith(`${rel}/`));

/** Katalog strony (albo zawierający strony) — tylko takie pomijamy; zasoby z public/ zostają. */
function containsPage(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name === "index.html") return true;
    if (entry.isDirectory() && containsPage(path.join(dir, entry.name))) return true;
  }
  return false;
}

const excluded = [];

function walk(relDir) {
  const absolute = path.join(OUT, relDir);
  // Pliki strony głównej (index.*, __next.* w katalogu głównym) wgrywamy ZAWSZE: FTP-Deploy-Action
  // dopasowuje wzorce bez "/" po samej nazwie pliku (matchBase) — wykluczenie "index.html" pominęłoby
  // index.html KAŻDEJ strony. To kilka małych plików z tego samego builda, więc to bezpieczne.
  // W katalogu-przodku wybranej strony (np. "inwestycja/") pliki tej strony pomijamy (ścieżka ma "/").
  const ownPageIncluded = relDir === "";

  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const rel = relDir === "" ? entry.name : `${relDir}/${entry.name}`;

    if (PAGE_FILE.test(entry.name)) {
      if (!ownPageIncluded && !isIncluded(rel)) excluded.push(entry.isDirectory() ? `${rel}/` : rel);
      continue;
    }
    if (!entry.isDirectory()) continue;
    if (relDir === "" && ALWAYS.has(entry.name)) continue;
    if (isIncluded(rel)) continue;
    if (isAncestor(rel)) {
      walk(rel);
      continue;
    }
    if (rel === "api" || containsPage(path.join(OUT, rel))) excluded.push(`${rel}/`);
  }
}

walk("");
// api/ nie jest w out/ w trakcie tego kroku? (zależy od kolejności) — dla pewności poza zakresem "admin" zawsze pomijane.
if (scope !== "admin" && !excluded.includes("api/")) excluded.push("api/");

process.stdout.write(excluded.join("\n") + (excluded.length ? "\n" : ""));
console.error(`Zakres "${scope}"${scope === "pages" ? ` (${includes.map((r) => `/${r}`).join(", ")})` : ""}: pomijam ${excluded.length} ścieżek.`);
