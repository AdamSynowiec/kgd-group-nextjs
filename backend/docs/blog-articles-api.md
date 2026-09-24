# API artykułów bloga (dla zewnętrznego systemu)

Endpoint do dodawania nowych wpisów na blog. Zapisuje artykuł w bazie danych - **nie buduje ani nie publikuje strony** (patrz [Publikacja](#publikacja)).

## Endpoint

| | |
|---|---|
| Metoda | `POST` |
| Adres | `https://DOMAIN_PLACEHOLDER/api/blog/articles` |

Wymagane jest **HTTPS** (żądanie przez `http://` jest odrzucane).

> Domenę zamień na docelową, gdy API zostanie przeniesione na produkcję.

## Nagłówki

| Nagłówek | Wartość | Wymagany |
|---|---|---|
| `Authorization` | `Bearer <TOKEN>` | tak |
| `Content-Type` | `application/json` | tak |

Token jest przekazywany wyłącznie w nagłówku (nigdy w adresie URL). Nie loguj go i nie umieszczaj w kodzie po stronie przeglądarki - API służy do komunikacji serwer–serwer.

## Body (JSON)

Maksymalny rozmiar żądania: **256 KB**. Nieznane pola są odrzucane (422).

| Pole | Typ | Wymagane | Reguły |
|---|---|---|---|
| `slug` | string | tak | Format `/blog/<nazwa>`: małe litery `a-z`, cyfry, myślniki (kebab-case), bez polskich znaków, dokładnie jeden segment po `/blog/`. Max 255 znaków. Unikalny. `/blog/page` jest zarezerwowany |
| `meta_title` | string | tak | 3–160 znaków. Zwykły tekst (bez `<`, `>` i podziałów linii). Służy też jako nagłówek artykułu |
| `meta_desc` | string | tak | 20–320 znaków. Zwykły tekst |
| `keyword` | string | nie | 1–120 znaków. Zwykły tekst |
| `cover_image` | string | nie | Zdjęcie tytułowe: pełny adres `http(s)://…` albo ścieżka od korzenia serwisu, np. `/uploads/foto.jpg`. Max 500 znaków. Adres musi być zakodowany (bez spacji i polskich liter). API zapisuje sam adres, nie pobiera pliku |
| `publish_date` | string | tak | ISO 8601 **z jawnym offsetem strefy**, np. `2026-09-20T10:00:00+02:00` lub `2026-09-20T08:00:00Z`. Data bez strefy jest odrzucana |
| `content` | string | tak | Fragment HTML (max 200 000 bajtów), nie cały dokument. Po sanityzacji musi zawierać jakiś tekst |

### Slug

- Poprawne: `/blog/przykladowy-artykul`, `blog/przykladowy-artykul` (bez początkowego `/` też przejdzie, zapisany zostanie z `/`).
- Niepoprawne: `/o-nas` (poza blogiem), `/blog/a/b` (zagnieżdżony), `/blog/Zażółć` (wielkie litery i polskie znaki), `/blog/page` (zarezerwowany).
- Slug jest kluczem artykułu i **nie można go zmienić** po utworzeniu. Ponowne wysłanie istniejącego sluga nigdy nie nadpisuje artykułu (409).

### `publish_date`

- Data w przeszłości lub teraźniejszości → artykuł zapisany jako **opublikowany**.
- Data w przyszłości → artykuł zapisany jako **szkic** (`draft`) i nie pojawi się na stronie, dopóki administrator nie opublikuje go w panelu (API nie ma operacji publikacji).
- Data służy też do sortowania listy bloga (najnowsze pierwsze) i jest wyświetlana czytelnikom jako data artykułu (dzień w czasie polskim).

### `content` - dozwolone HTML

Wysyłaj wyłącznie fragment treści artykułu (np. `<section class="…"><h1>…</h1><p>…</p></section>`), a nie cały dokument. Tytuł strony jest wyświetlany osobno z `meta_title`.

**Dozwolone tagi:**

```
układ:    div  section  article  header  footer  nav  aside  figure  figcaption
tekst:    h1 h2 h3 h4 h5 h6  p  span  blockquote  pre  code  br  hr
          strong  b  em  i  u  s  small  mark  sub  sup
linki:    a   (href, title)
obrazki:  img (src, alt, width, height)
listy:    ul  ol  li  dl  dt  dd
tabele:   table  caption  thead  tbody  tfoot  tr  th  td  (colspan, rowspan na th/td)
style:    <style> (blok CSS, patrz Stylowanie)
svg:      svg  g  path  circle  ellipse  rect  line  polyline  polygon  text  tspan
```

Na tagach HTML i SVG dozwolone są atrybuty `class`, `id` i `style` (patrz [Stylowanie](#stylowanie)). `id` przydaje się np. jako cel kotwicy (`<a href="#sekcja">` → `<h2 id="sekcja">`). Dodatkowo na `svg` i jego elementach dozwolone są atrybuty rysunkowe: `xmlns`, `viewBox`, `preserveAspectRatio`, `width`, `height`, `x`, `y`, `x1`, `y1`, `x2`, `y2`, `cx`, `cy`, `r`, `rx`, `ry`, `d`, `points`, `transform`, `fill`, `fill-rule`, `fill-opacity`, `clip-rule`, `opacity`, `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`, `stroke-miterlimit`, `stroke-dasharray`, `stroke-dashoffset`, `stroke-opacity`, `role`, `aria-hidden`, `focusable`.

**Zasady sanityzacji:**

- Tagi spoza listy są usuwane, a ich tekst zostaje (np. `<button>Klik</button>` → `Klik`).
- Tagi `script`, `iframe`, `object`, `embed`, `noscript`, `template`, `math` są usuwane **razem z zawartością**. (Tag `<style>` i `<svg>` są dozwolone — patrz niżej.)
- Wewnątrz `svg` elementy spoza listy (m.in. `use`, `image`, `foreignObject`, `animate`, `set`, `defs`, gradienty) są rozpakowywane, a `script` usuwany. Atrybuty SVG o wartościach zawierających `url(`, `javascript:` itp. są usuwane. Elementy `title` i `desc` w `svg` nie są obsługiwane, a `<title>` w treści powoduje odrzucenie (patrz ostatni punkt).
- Atrybuty poza wymienionymi (w tym `data-*`, `name` i wszystkie handlery `on*`, np. `onclick`) są usuwane.
- W `href` i `src` dozwolone są protokoły `https:`, `http:`, `mailto:` oraz adresy względne (`/kontakt`, `#kotwica`). Przy adresach `javascript:`, `data:`, `vbscript:` i innych atrybut `href` jest usuwany (tekst linku zostaje), a obrazek z niebezpiecznym lub brakującym `src` jest usuwany w całości.
- Komentarze HTML są usuwane.
- Treść zawierająca elementy struktury dokumentu - `html`, `head`, `body`, `title`, `meta`, `link`, `base`, `main` - jest **odrzucana** (422), a nie czyszczona. Tag `article` jest dozwolony.

Jeśli po sanityzacji w treści nie zostaje żaden tekst (np. sam obrazek, sam `svg` albo sam blok `<style>`), żądanie jest odrzucane (422).

### Stylowanie

Do stylowania służą trzy mechanizmy: atrybut `class`, atrybut `style` i blok `<style>`.

- **Atrybut `style`:** deklaracje zawierające `url()`, `image-set()`, `expression()`, `@import`, `javascript:`, `vbscript:`, `behavior:`, `-moz-binding`, backslash lub komentarz CSS są usuwane pojedynczo, reszta stylu zostaje. Jeśli żadna deklaracja nie przejdzie, atrybut jest usuwany.
- **Blok `<style>`:** przechodzi w całości albo wcale. Cały blok jest usuwany, jeśli zawiera znak `<`, `url()`, `image-set()`, `expression()`, `@import`, `javascript:`, `vbscript:`, `behavior:`, `-moz-binding` lub backslash. Reguły `@media` i `@keyframes` oraz selektory z `>` są dozwolone. Blok `<style>` działa na całą stronę artykułu, więc selektory pisz ostrożnie (np. `.moj-artykul p`, a nie `p` ani `body`).
- **`class`:** klasa daje efekt tylko wtedy, gdy strona ma dla niej regułę CSS. Klasy Tailwind, których serwis nigdzie nie używa, nie mają reguł i nie zadziałają. Wygląd, który ma być pewny, opieraj na `style`.

## Odpowiedzi

### 201 Created

```json
{
  "success": true,
  "id": 42,
  "slug": "/blog/przykladowy-artykul",
  "status": "created",
  "publish_status": "published"
}
```

`publish_status`: `published` (data w przeszłości) lub `draft` (data w przyszłości).

### Błędy

Każdy błąd ma ten sam kształt:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "fields": { "slug": "Must look like /blog/kebab-case-name ..." }
  }
}
```

Pole `fields` występuje tylko przy `VALIDATION_ERROR`. Błędy walidacji są zwracane **wszystkie naraz**.

| HTTP | `error.code` | Kiedy |
|---|---|---|
| 400 | `MALFORMED_JSON` | Body nie jest poprawnym JSON-em |
| 400 | `BAD_REQUEST` | Body nie jest obiektem JSON |
| 401 | `UNAUTHORIZED` | Brak tokenu lub token nieprawidłowy |
| 403 | `INSECURE_TRANSPORT` | Żądanie przez `http://` zamiast `https://` |
| 404 | `NOT_FOUND` | Nieznany adres pod `/blog/articles/...` |
| 409 | `SLUG_CONFLICT` | Artykuł o tym slugu już istnieje |
| 413 | `PAYLOAD_TOO_LARGE` | Body większe niż 256 KB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | `Content-Type` inny niż `application/json` |
| 422 | `VALIDATION_ERROR` | Poprawny JSON, ale złe wartości pól (szczegóły w `fields`) |
| 500 | `INTERNAL_ERROR` | Błąd serwera (szczegóły tylko w logach serwera) |

Inna metoda niż `POST` zwraca 405, a nieznana ścieżka 404 w prostszym formacie: `{"error":{"status":405,"message":"..."}}`.

### Ponawianie żądań

- `POST` jest tworzeniem, nie upsertem: powtórzenie tego samego żądania zwróci `409 SLUG_CONFLICT`. Jeśli poprzednie żądanie skończyło się timeoutem, traktuj `409` jako „artykuł już istnieje”.
- Ponawiaj tylko przy `500` i timeoucie (z rosnącym odstępem). Błędów `4xx` nie ponawiaj bez poprawienia żądania.

## Publikacja

Odpowiedź `201` oznacza **zapis do bazy danych**. Strona jest statyczna, więc artykuł pojawi się pod adresem `/blog/<slug>/` dopiero po kolejnym buildzie serwisu, który uruchamiany jest osobno (patrz niżej). Artykuł z datą w przyszłości (`draft`) wymaga dodatkowo opublikowania przez administratora w panelu.

## Uruchomienie builda

Po dodaniu artykułów wywołaj ten endpoint, żeby przebudować i wdrożyć stronę. Używa **tego samego tokenu** i tych samych nagłówków co dodawanie artykułów.

| | |
|---|---|
| Metoda | `POST` |
| Adres | `https://DOMAIN_PLACEHOLDER/api/build` |
| Body | brak |

Wywołanie tylko **zleca** build w GitHub Actions - odpowiedź wraca od razu, a build i wdrożenie trwają zwykle kilka minut. Artykuły są widoczne na stronie dopiero po jego zakończeniu.

```bash
curl -i -X POST "https://DOMAIN_PLACEHOLDER/api/build" \
  -H "Authorization: Bearer TWOJ_TOKEN"
```

**202 Accepted:**

```json
{"success":true,"status":"build_triggered","dispatched_at":"2026-09-20T08:15:30Z"}
```

| HTTP | `error.code` | Kiedy |
|---|---|---|
| 401 | `UNAUTHORIZED` | Brak tokenu lub token nieprawidłowy |
| 403 | `INSECURE_TRANSPORT` | Żądanie przez `http://` |
| 502 | `BUILD_TRIGGER_FAILED` | GitHub odrzucił zlecenie (np. wygasły token GitHub po naszej stronie) |
| 500 | `BUILD_TRIGGER_FAILED` | Serwer nie ma skonfigurowanego dostępu do GitHuba |

Zalecenia: dodaj wiele artykułów, a build wywołaj **raz na końcu** - każde wywołanie uruchamia osobny build i wdrożenie, więc wywoływanie go po każdym artykule niepotrzebnie mnoży przebiegi. Nie wywołuj go częściej niż raz na kilka minut.

## Przykłady curl

Zamień `TWOJ_TOKEN` na token otrzymany od administratora.

### Nowy artykuł

```bash
curl -i -X POST "https://DOMAIN_PLACEHOLDER/api/blog/articles" \
  -H "Authorization: Bearer TWOJ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "/blog/przykladowy-artykul",
    "meta_title": "Przykładowy tytuł artykułu",
    "meta_desc": "Meta description artykułu, opisująca w skrócie jego treść.",
    "keyword": "przykładowe słowo kluczowe",
    "publish_date": "2026-09-20T10:00:00+02:00",
    "content": "<p>Wprowadzenie</p><h2>Pierwszy nagłówek</h2><p>Treść sekcji.</p>"
  }'
```

Odpowiedź: `201 Created`

```json
{"success":true,"id":42,"slug":"/blog/przykladowy-artykul","status":"created","publish_status":"published"}
```

### Artykuł ze zdjęciem tytułowym, listą i tabelą

```bash
curl -i -X POST "https://DOMAIN_PLACEHOLDER/api/blog/articles" \
  -H "Authorization: Bearer TWOJ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "/blog/artykul-ze-zdjeciem",
    "meta_title": "Artykuł ze zdjęciem tytułowym",
    "meta_desc": "Artykuł testowy ze zdjęciem tytułowym, listą i tabelą przekazany przez API.",
    "keyword": "zdjęcie tytułowe",
    "cover_image": "https://example.com/zdjecia/tytulowe.jpg",
    "publish_date": "2026-09-20T08:00:00Z",
    "content": "<p>Wstęp z <a href=\"https://example.com\">linkiem</a>.</p><h2>Lista</h2><ul><li>Pierwszy punkt</li><li><strong>Drugi</strong> punkt</li></ul><h2>Tabela</h2><table><thead><tr><th>Nazwa</th><th>Wartość</th></tr></thead><tbody><tr><td>A</td><td>1</td></tr></tbody></table>"
  }'
```

### Artykuł zaplanowany na przyszłość

```bash
curl -i -X POST "https://DOMAIN_PLACEHOLDER/api/blog/articles" \
  -H "Authorization: Bearer TWOJ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "/blog/artykul-na-przyszlosc",
    "meta_title": "Artykuł zaplanowany na przyszłość",
    "meta_desc": "Artykuł z datą publikacji w przyszłości zostanie zapisany jako szkic.",
    "publish_date": "2030-01-15T09:00:00+01:00",
    "content": "<p>Treść zaplanowanego artykułu.</p>"
  }'
```

Odpowiedź: `201 Created`, `"publish_status": "draft"`.

### Przykłady błędów

**Błąd walidacji** (422) - zły slug, data bez strefy, pusta treść po sanityzacji:

```bash
curl -i -X POST "https://DOMAIN_PLACEHOLDER/api/blog/articles" \
  -H "Authorization: Bearer TWOJ_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "/o-nas",
    "meta_title": "Tytuł poprawny",
    "meta_desc": "Opis artykułu, który jest wystarczająco długi.",
    "publish_date": "2026-09-20T10:00:00",
    "content": "<script>alert(1)</script>"
  }'
```

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "fields": {
      "slug": "Must look like /blog/kebab-case-name (a-z, 0-9, hyphens); \"/blog/page\" is reserved",
      "publish_date": "Expected ISO 8601 with UTC offset, e.g. 2026-09-20T10:00:00+02:00",
      "content": "Content is empty after sanitization"
    }
  }
}
```

**Zły token** (401):

```bash
curl -i -X POST "https://DOMAIN_PLACEHOLDER/api/blog/articles" \
  -H "Authorization: Bearer ZLY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

```json
{"success":false,"error":{"code":"UNAUTHORIZED","message":"Invalid or missing API token."}}
```

**Duplikat sluga** (409) - ponowne wysłanie pierwszego przykładu:

```json
{"success":false,"error":{"code":"SLUG_CONFLICT","message":"An article with this slug already exists."}}
```

### PowerShell (Windows)

```powershell
$body = @{
  slug         = "/blog/przykladowy-artykul"
  meta_title   = "Przykładowy tytuł artykułu"
  meta_desc    = "Meta description artykułu, opisująca w skrócie jego treść."
  keyword      = "przykładowe słowo kluczowe"
  publish_date = "2026-09-20T10:00:00+02:00"
  content      = '<p>Wprowadzenie</p><h2>Pierwszy nagłówek</h2><p>Treść sekcji.</p>'
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "https://DOMAIN_PLACEHOLDER/api/blog/articles" `
  -Headers @{ Authorization = "Bearer TWOJ_TOKEN" } `
  -ContentType "application/json; charset=utf-8" `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
```