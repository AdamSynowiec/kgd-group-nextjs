/**
 * Jednorazowy backfill: dodaje "type" (string|bool|number|table|asset) do
 * każdego węzła {value, editable} w plikach seed db/inwestycje/*.sql i
 * db/site/home.sql, który go jeszcze nie ma.
 *
 * Działa TYLKO na tych plikach (są "źródłem prawdy" dla świeżej instalacji /
 * importu ręcznego, patrz komentarze w każdym pliku) — NIE jest zamiennikiem
 * migracji żywej bazy: db/schema.sql i historia migracji (004/006) pokazują,
 * że te pliki mogą się rozjechać z tym, co faktycznie jest w produkcyjnej
 * bazie (np. po edycjach z panelu). Backfill żywej bazy to osobny skrypt PHP:
 * backend/scripts/backfill-field-types.php.
 *
 * Bezpieczeństwo: każdy plik jest przed zapisem weryfikowany "zero utraty
 * danych" — porównanie {path: value/editable/label} każdego węzła przed i po
 * transformacji (poza dodanym "type") musi być identyczne, inaczej skrypt
 * przerywa się BEZ zapisu żadnego pliku.
 *
 * Uruchomienie: node scripts/migrate-field-types.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { classifyFieldType } from "../src/lib/fieldType.ts";

const FILES = [
  "db/site/home.sql",
  "db/inwestycje/krj307-2.sql",
  "db/inwestycje/morelife-apartments.sql",
  "db/inwestycje/pod-stokiem-apartamenty.sql",
  "db/inwestycje/pod-stokiem-willa.sql",
  "db/inwestycje/pylna-residence.sql",
  "db/inwestycje/rudava-park.sql",
  "db/inwestycje/the-emaus.sql",
  "db/inwestycje/villaverde-wola.sql",
];

const TUPLE_PATTERN = /\('(\/[^']*)',\s*'([^']*)'\)/g;

/**
 * MySQL przetwarza escape'y (\\ -> \, \" -> ", \n -> newline, ...) wewnątrz
 * łańcuchów w '...' JESZCZE PRZED zapisaniem do kolumny JSON — więc bajty w
 * pliku .sql to NIE jest jeszcze finalny JSON. Odkryte na db/site/home.sql:
 * "\\\"Dla inwestora\\\"" w pliku to poprawnie zapisane `\"Dla inwestora\"`
 * (czyli JSON-owy escaped-cudzysłów) — JSON.parse na surowych bajtach pliku
 * się na tym wywala, trzeba najpierw zdekodować warstwę MySQL-a.
 * Referencja: https://dev.mysql.com/doc/refman/8.0/en/string-literals.html
 */
function mysqlDecodeStringLiteral(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== "\\" || i === raw.length - 1) {
      out += ch;
      continue;
    }
    const next = raw[i + 1];
    switch (next) {
      case "0": out += "\0"; break;
      case "'": out += "'"; break;
      case '"': out += '"'; break;
      case "b": out += "\b"; break;
      case "n": out += "\n"; break;
      case "r": out += "\r"; break;
      case "t": out += "\t"; break;
      case "Z": out += "\x1a"; break;
      case "\\": out += "\\"; break;
      case "%": out += "\\%"; break;
      case "_": out += "\\_"; break;
      default: out += next; break; // backslash jest ignorowany dla nierozpoznanej sekwencji
    }
    i++;
  }
  return out;
}

/** Odwrotność mysqlDecodeStringLiteral — tylko backslash i pojedynczy cudzysłów wymagają ucieczki dla SQL. */
function mysqlEncodeStringLiteral(decoded: string): string {
  return decoded.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function isEditableNode(node: unknown): node is { value: unknown; editable: boolean; label?: string; type?: unknown } {
  return (
    node !== null &&
    typeof node === "object" &&
    !Array.isArray(node) &&
    "value" in node &&
    "editable" in node &&
    typeof (node as { editable: unknown }).editable === "boolean"
  );
}

const VALID_TYPES = new Set(["string", "bool", "number", "table", "asset"]);

let addedCount = 0;
let alreadyTypedCount = 0;

function backfillTypes(node: unknown): void {
  if (Array.isArray(node)) {
    for (const item of node) backfillTypes(item);
    return;
  }

  if (node === null || typeof node !== "object") return;

  if (isEditableNode(node)) {
    if (typeof node.type === "string" && VALID_TYPES.has(node.type)) {
      alreadyTypedCount++;
      return;
    }
    node.type = classifyFieldType(node.value, node.label);
    addedCount++;
    return;
  }

  for (const value of Object.values(node as Record<string, unknown>)) {
    backfillTypes(value);
  }
}

/** Snapshot {ścieżka: {value, editable, label}} dla każdego węzła edytowalnego — do porównania przed/po. */
function snapshotEditableNodes(node: unknown, path: string, out: Map<string, string>): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => snapshotEditableNodes(item, `${path}[${i}]`, out));
    return;
  }

  if (node === null || typeof node !== "object") return;

  if (isEditableNode(node)) {
    out.set(path, JSON.stringify({ value: node.value, editable: node.editable, label: node.label ?? null }));
    return;
  }

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    snapshotEditableNodes(value, path ? `${path}.${key}` : key, out);
  }
}

function assertNoDataLoss(before: unknown, after: unknown, context: string): void {
  const beforeMap = new Map<string, string>();
  const afterMap = new Map<string, string>();
  snapshotEditableNodes(before, "", beforeMap);
  snapshotEditableNodes(after, "", afterMap);

  if (beforeMap.size !== afterMap.size) {
    throw new Error(
      `${context}: liczba węzłów edytowalnych się zmieniła (${beforeMap.size} -> ${afterMap.size})`
    );
  }

  for (const [path, beforeValue] of beforeMap) {
    const afterValue = afterMap.get(path);
    if (afterValue === undefined) {
      throw new Error(`${context}: zniknął węzeł "${path}"`);
    }
    if (afterValue !== beforeValue) {
      throw new Error(`${context}: zmieniła się treść węzła "${path}" (poza dodaniem "type")`);
    }
  }
}

function preflightQuoteCheck(sqlText: string): boolean {
  const codeLines = sqlText.split("\n").filter((line) => {
    const trimmed = line.trim();
    return trimmed !== "" && !trimmed.startsWith("--");
  });
  const code = codeLines.join("\n");
  const quoteCount = (code.match(/'/g) ?? []).length;
  const tupleCount = (code.match(/\('\/[^']*',\s*'\{/g) ?? []).length;
  return quoteCount === tupleCount * 4;
}

let totalTuples = 0;
let filesChanged = 0;

for (const relPath of FILES) {
  const original = readFileSync(relPath, "utf8");

  if (!preflightQuoteCheck(original)) {
    throw new Error(`${relPath}: kontrola cudzysłowów nie przeszła — nie splicuję tego pliku, sprawdź ręcznie.`);
  }

  let rewritten = "";
  let cursor = 0;
  let fileTuples = 0;
  let fileChanged = false;
  addedCount = 0;
  alreadyTypedCount = 0;

  for (const match of original.matchAll(TUPLE_PATTERN)) {
    fileTuples++;
    const [fullMatch, slug, rawContentLiteral] = match;
    const matchIndex = match.index ?? 0;

    const contentJson = mysqlDecodeStringLiteral(rawContentLiteral);

    const parsed: unknown = JSON.parse(contentJson);
    const before = JSON.parse(contentJson);
    backfillTypes(parsed);
    assertNoDataLoss(before, parsed, `${relPath} (${slug})`);

    const newContentJson = JSON.stringify(parsed);
    const newRawContentLiteral = mysqlEncodeStringLiteral(newContentJson);

    // Weryfikacja w drugą stronę: to, co właśnie zakodowaliśmy dla SQL-a,
    // musi się dekodować z powrotem do dokładnie tego samego JSON-u — inaczej
    // nie splicujemy (lepiej przerwać niż zapisać plik, którego MySQL sam nie
    // odczyta poprawnie).
    if (mysqlDecodeStringLiteral(newRawContentLiteral) !== newContentJson) {
      throw new Error(`${relPath} (${slug}): kodowanie SQL nie odwraca się poprawnie — przerywam bez zapisu.`);
    }

    const newTuple = `('${slug}', '${newRawContentLiteral}')`;

    rewritten += original.slice(cursor, matchIndex) + newTuple;
    cursor = matchIndex + fullMatch.length;

    if (newRawContentLiteral !== rawContentLiteral) fileChanged = true;
  }
  rewritten += original.slice(cursor);

  totalTuples += fileTuples;

  console.log(
    `${relPath}: ${fileTuples} stron, +${addedCount} nowych "type" (${alreadyTypedCount} już miało poprawny typ)`
  );

  if (fileChanged) {
    writeFileSync(relPath, rewritten, "utf8");
    filesChanged++;
  }
}

console.log(`\nRazem: ${totalTuples} stron w ${FILES.length} plikach, zmieniono ${filesChanged} plik(ów).`);
