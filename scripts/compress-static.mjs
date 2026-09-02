/**
 * Domknięcie `next build` (output: "export"): tworzy skompresowane bliźniaki
 * plików tekstowych w out/ — .br (brotli) i .gz (gzip).
 *
 * Dlaczego to w ogóle jest potrzebne: hosting współdzielony (ct8.pl, nginx)
 * nie kompresuje odpowiedzi w locie — potwierdzone w PageSpeed Insights
 * ("Nie zastosowano kompresji" dla samego dokumentu HTML). Bez kompresji
 * ~380 KiB JS/CSS tej strony idzie przez sieć w całości; ten skrypt sam
 * generuje pliki, które serwer MÓGŁBY wysłać zamiast oryginału, gdyby był
 * do tego skonfigurowany (patrz public/.htaccess — reguły serwowania .br/.gz
 * dla hostingów oparte o Apache/mod_rewrite; na nginx bez dostępu do
 * konfiguracji serwera zadziała to tylko, jeśli host ma globalnie włączone
 * `gzip_static`/`brotli_static` — sam plik na dysku nic nie gwarantuje).
 *
 * Kompresujemy przy buildzie, nie w locie, z dwóch powodów:
 *  - brotli na poziomie 11 (najwyższa, najwolniejsza jakość) — czas kompresji
 *    płacimy raz przy buildzie, nie przy każdym żądaniu użytkownika,
 *  - serwer (jeśli w ogóle by kompresował w locie) nie musi tego robić za
 *    każdym razem dla tej samej, niezmiennej treści.
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");

if (!fs.existsSync(OUT)) {
  console.error('BŁĄD: brak katalogu out/. Czy next.config.ts ma output: "export"?');
  process.exit(1);
}

const COMPRESSIBLE_EXTENSIONS = new Set([".html", ".css", ".js", ".svg", ".xml", ".txt", ".json", ".webmanifest"]);

// Poniżej tej wielkości narzut nagłówków zjada zysk kompresji.
const MIN_SIZE_BYTES = 1024;

let compressedCount = 0;
let bytesBefore = 0;
let bytesAfterBrotli = 0;

function compressDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      compressDir(fullPath);
      continue;
    }

    if (!COMPRESSIBLE_EXTENSIONS.has(path.extname(entry.name))) continue;

    const data = fs.readFileSync(fullPath);
    if (data.length < MIN_SIZE_BYTES) continue;

    const brotli = zlib.brotliCompressSync(data, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
        [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length,
      },
    });

    // gzip jako wariant zapasowy — brotli po HTTPS obsługują wszystkie
    // aktualne przeglądarki, ale gzip rozumie dosłownie każda.
    const gzip = zlib.gzipSync(data, { level: 9 });

    fs.writeFileSync(`${fullPath}.br`, brotli);
    fs.writeFileSync(`${fullPath}.gz`, gzip);

    compressedCount += 1;
    bytesBefore += data.length;
    bytesAfterBrotli += brotli.length;
  }
}

compressDir(OUT);

const toKib = (bytes) => (bytes / 1024).toFixed(0);
const savedPercent = bytesBefore > 0 ? (100 - (100 * bytesAfterBrotli) / bytesBefore).toFixed(0) : 0;

console.log(
  `Kompresja: ${compressedCount} plików, ${toKib(bytesBefore)} KiB -> ${toKib(bytesAfterBrotli)} KiB brotli (${savedPercent}% mniej)`
);
