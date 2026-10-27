# REST API v1 (odczyt stron)

API do odczytu treści opublikowanych stron serwisu, przeznaczone dla zewnętrznych systemów (serwer–serwer). Zwraca wyłącznie **pola publiczne** — te, które administrator świadomie udostępnił (patrz [Pola publiczne](#pola-publiczne)).

Specyfikacja maszynowa (OpenAPI 3.1, do wygenerowania klienta albo podglądu w Swagger UI / Postman): [`api-v1.openapi.yaml`](api-v1.openapi.yaml).

## Spis treści

- [Szybki start](#szybki-start)
- [Adres API](#adres-api)
- [Autoryzacja](#autoryzacja)
- [Pola publiczne](#pola-publiczne)
- [GET /pages](#get-pages)
- [Paginacja](#paginacja)
- [Cache i ETag](#cache-i-etag)
- [Limit zapytań](#limit-zapytań)
- [Błędy](#błędy)
- [Przykłady](#przykłady)
- [Dobre praktyki](#dobre-praktyki)

## Szybki start

1. Administrator tworzy token w panelu: **Ustawienia → Tokeny API** (zakres `pages:read`) i przekazuje go bezpiecznym kanałem.
2. Administrator nadaje **identyfikatory** polom, które mają być dostępne (np. `heroTitle`) — w edytorze strony menu **⋯** przy polu → „Identyfikator pola”.
3. Wywołanie:

```bash
curl -H "Authorization: Bearer kgd_TWOJ_TOKEN" \
  "https://kgd-group.pl/api/v1.php?route=/pages&slug=%2Finwestycja%2Ffoxhills&fields=heroTitle"
```

## Adres API

| Forma | Adres bazowy | Uwagi |
|---|---|---|
| Zawsze działająca | `https://kgd-group.pl/api/v1.php?route=` | Ścieżkę endpointu podajesz w parametrze `route`, np. `?route=/pages&slug=…` |
| Docelowa (ładna) | `https://kgd-group.pl/api/v1` | Np. `/api/v1/pages?slug=…` — działa dopiero po włączeniu reguły przepisywania adresów na serwerze |

Obie formy działają identycznie. Jeśli ładny adres zwraca 404 z serwera (nie z API), użyj formy z `?route=`.

- Wymagane jest **HTTPS** — żądanie przez `http://` jest odrzucane (403).
- Wersja API jest częścią adresu (`v1`). Zmiany niezgodne wstecz pojawią się wyłącznie w nowej wersji (`v2`).
- API nie obsługuje CORS — nie wywołuj go z przeglądarki, tylko z serwera (token nie może trafić do kodu po stronie klienta).

## Autoryzacja

Każde żądanie musi mieć nagłówek:

| Nagłówek | Wartość | Wymagany |
|---|---|---|
| `Authorization` | `Bearer <TOKEN>` | tak |
| `Accept` | `application/json` | zalecany |
| `If-None-Match` | wartość `ETag` z poprzedniej odpowiedzi | nie (patrz [Cache i ETag](#cache-i-etag)) |

**Token:**

- Ma postać `kgd_` + 48 znaków, np. `kgd_3f9a…`.
- Jest widoczny **tylko raz**, w chwili utworzenia w panelu. Serwer przechowuje wyłącznie jego skrót — zagubionego tokenu nie da się odzyskać, trzeba utworzyć nowy.
- Ma **zakres** (uprawnienia). Każdy endpoint wymaga konkretnego zakresu:

| Zakres | Pozwala na |
|---|---|
| `pages:read` | Odczyt opublikowanych stron i ich pól publicznych (`GET /pages`) |

- Może mieć **datę wygaśnięcia** (30 dni / 90 dni / rok / bez wygaśnięcia) i może zostać **cofnięty** w panelu — działa to natychmiast.
- Przekazuj go wyłącznie w nagłówku, nigdy w adresie URL. Nie zapisuj go w logach ani w repozytorium kodu.

## Pola publiczne

Strona w serwisie ma wiele pól (nagłówki, opisy, tabele, zdjęcia…). Przez API dostępne są **tylko pola, którym administrator nadał identyfikator** — w edytorze strony: menu **⋯** przy polu → „Identyfikator pola” (nadany identyfikator widać przy nazwie pola jako `#heroTitle`). Pole bez identyfikatora dla API nie istnieje. W parametrze `fields` i w odpowiedzi pola występują właśnie pod tymi identyfikatorami.

- Identyfikator to stały kontrakt z integracją: nie zmienia się przy przebudowie strony, zmianie kolejności sekcji ani etykiet w panelu.
- Format identyfikatora: litery, cyfry i `_`, zaczyna się od litery, maks. 64 znaki (np. `heroTitle`, `price_from`). Wielkość liter ma znaczenie.
- Identyfikator jest unikalny w obrębie strony. Na różnych stronach ten sam identyfikator może oznaczać analogiczne pole (np. `heroTitle` na każdej stronie inwestycji).

**Typy wartości w odpowiedzi:**

| Pole w panelu | Wartość w API | Przykład |
|---|---|---|
| Tekst | `string` | `"Fox Hills Residences"` |
| Tekst sformatowany | `string` z HTML | `"<p>Rezydencje <strong>przy polu golfowym</strong></p>"` |
| Liczba | `number` | `11200` |
| Przełącznik | `boolean` | `true` |
| Zdjęcie / plik | `string` — **pełny adres URL** | `"https://kgd-group.pl/api/uploads/3f9a….webp"` |
| Tabela | `array` obiektów (wiersz = obiekt, kolumna = klucz) | `[{ "unit": "I.W.11", "status": "Dostępny" }]` |
| Lista | `array` | `["Basen", "Siłownia"]` |

Wartości są zwracane tak, jak zostały wpisane w panelu (np. cena w kolumnie tekstowej może mieć postać `"2 512 750 zł"`). Kluczy technicznych tabel (zaczynających się od `_`) API nie zwraca.

## GET /pages

Lista **opublikowanych** stron z ich polami publicznymi. Szkice nigdy nie są zwracane.

```http
GET /api/v1.php?route=/pages&slug=%2Finwestycja%2Ffoxhills&fields=heroTitle,priceFrom HTTP/1.1
Host: kgd-group.pl
Authorization: Bearer kgd_TWOJ_TOKEN
Accept: application/json
```

Wymagany zakres: `pages:read`. Metody: `GET`, `HEAD` (same nagłówki, bez treści).

### Parametry zapytania

| Parametr | Typ | Domyślnie | Opis |
|---|---|---|---|
| `slug` | string | — | Tylko strona o tym adresie, np. `/inwestycja/foxhills` (ukośnik na początku opcjonalny). Zakoduj go w URL: `%2Finwestycja%2Ffoxhills`. Bez parametru — wszystkie opublikowane strony |
| `fields` | string | wszystkie pola publiczne | Identyfikatory pól oddzielone przecinkami, np. `heroTitle,priceFrom`. Zwracane są dokładnie te identyfikatory — identyfikator, którego strona nie ma, ma wartość `null` |
| `limit` | integer | `20` | Liczba stron w odpowiedzi, `1`–`100` |
| `offset` | integer | `0` | Ile stron pominąć (paginacja), od `0` |

- **Nieznany parametr kończy się błędem 400** (np. `field=` zamiast `fields=`) — literówka nie zwróci po cichu innego wyniku.
- Strony są sortowane po adresie (`slug`) rosnąco.
- Brak strony o podanym `slug` (albo strona jest szkicem) to **200 z pustą listą `data`**, a nie 404 — filtr kolekcji po prostu nic nie znalazł.

### Odpowiedź 200

```json
{
  "data": [
    {
      "id": "42",
      "slug": "/inwestycja/foxhills",
      "updatedAt": "2026-10-27T09:14:02Z",
      "fields": {
        "heroTitle": "Fox Hills Residences",
        "priceFrom": 11200
      }
    }
  ],
  "meta": { "total": 1, "count": 1, "limit": 20, "offset": 0 },
  "links": {
    "self": "/api/v1.php?route=/pages&offset=0&limit=20&slug=%2Finwestycja%2Ffoxhills&fields=heroTitle%2CpriceFrom",
    "next": null,
    "prev": null
  }
}
```

| Pole | Opis |
|---|---|
| `data[].id` | Stały identyfikator strony (tekst). Nie zmienia się, nawet jeśli zmieni się adres strony |
| `data[].slug` | Adres strony w serwisie |
| `data[].updatedAt` | Ostatnia zmiana strony, ISO 8601 w UTC |
| `data[].fields` | Pola publiczne: identyfikator pola → wartość (patrz [typy wartości](#pola-publiczne)) |
| `meta.total` | Liczba wszystkich stron spełniających filtr |
| `meta.count` | Liczba stron w tej odpowiedzi |
| `meta.limit`, `meta.offset` | Użyte wartości paginacji |
| `links.self` / `next` / `prev` | Adresy tej, następnej i poprzedniej strony wyników (`null`, gdy nie ma) |

### Nagłówki odpowiedzi

| Nagłówek | Opis |
|---|---|
| `Content-Type` | `application/json; charset=utf-8` (błędy: `application/problem+json`) |
| `ETag` | Wersja treści odpowiedzi — patrz [Cache i ETag](#cache-i-etag) |
| `Cache-Control` | `private, no-cache` — możesz trzymać odpowiedź u siebie, ale przed użyciem sprawdź ją przez `If-None-Match` |
| `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` | Limit zapytań — patrz [Limit zapytań](#limit-zapytań) |
| `X-Request-Id` | Identyfikator żądania — podaj go przy zgłaszaniu problemu |

## Paginacja

Przy wielu stronach pobieraj je partiami, przechodząc po `links.next`, aż będzie `null`:

```text
GET …&limit=50&offset=0     → meta.total = 120, links.next = …&offset=50
GET …&limit=50&offset=50    → links.next = …&offset=100
GET …&limit=50&offset=100   → links.next = null  (koniec)
```

## Cache i ETag

Każda udana odpowiedź ma nagłówek `ETag`. Zapamiętaj go i wyślij przy kolejnym zapytaniu w `If-None-Match`:

- treść się nie zmieniła → **`304 Not Modified`** bez treści (użyj zapamiętanej wersji),
- treść się zmieniła → `200` z nową treścią i nowym `ETag`.

Zapytania kończące się `304` też liczą się do limitu, ale są szybsze i nie przesyłają danych.

## Limit zapytań

- **120 zapytań na minutę na token** (okno liczone od pełnej minuty).
- Nagłówki w każdej odpowiedzi: `RateLimit-Limit` (limit), `RateLimit-Remaining` (ile zostało w tym oknie), `RateLimit-Reset` (za ile sekund okno się odnowi).
- Po przekroczeniu: **`429 Too Many Requests`** z nagłówkiem `Retry-After` (sekundy) — odczekaj tyle i ponów.

## Błędy

Błędy mają format **Problem Details (RFC 9457)**, `Content-Type: application/problem+json`:

```json
{
  "type": "https://kgd-group.pl/api/v1/docs#invalid-parameter",
  "title": "Invalid request parameter",
  "status": 400,
  "detail": "One or more query parameters are invalid.",
  "instance": "/api/v1/pages",
  "invalidParams": [
    { "name": "limit", "reason": "Expected an integer between 1 and 100." }
  ]
}
```

- `type` — stały identyfikator rodzaju błędu (część po `#`); na nim opieraj obsługę błędów w kodzie, nie na treści `detail`.
- `title` — stały opis rodzaju błędu, `detail` — opis tego konkretnego wystąpienia (może się zmieniać).

| Status | `type` (po `#`) | Kiedy | Co zrobić |
|---|---|---|---|
| 400 | `invalid-parameter` | Niepoprawny lub nieznany parametr zapytania. Lista w `invalidParams` | Popraw zapytanie, nie ponawiaj bez zmian |
| 401 | `unauthorized` | Brak nagłówka `Authorization`, token zły, wygasły albo cofnięty. Nagłówek `WWW-Authenticate: Bearer … error="invalid_token"` | Sprawdź token; jeśli wygasł lub został cofnięty — poproś o nowy |
| 403 | `insufficient-scope` | Token nie ma wymaganego zakresu (`requiredScope` w odpowiedzi) | Poproś o token z odpowiednim zakresem |
| 403 | `insecure-transport` | Żądanie przez `http://` | Użyj `https://` |
| 404 | `not-found` | Nie ma takiego endpointu (np. literówka w `route`) | Sprawdź adres |
| 405 | `method-not-allowed` | Metoda inna niż `GET`/`HEAD`. Nagłówek `Allow` | Użyj `GET` |
| 429 | `rate-limited` | Przekroczony limit zapytań. Nagłówek `Retry-After` | Odczekaj `Retry-After` sekund i ponów |
| 500 | `internal-error` | Nieoczekiwany błąd serwera | Ponów później; przy powtarzaniu się zgłoś z `X-Request-Id` |

**Ponawianie:** ponawiaj wyłącznie `429` (po `Retry-After`) i `5xx` (z rosnącym odstępem, np. 1 s, 2 s, 4 s, maks. 3–5 prób). Błędów `4xx` innych niż `429` nie ponawiaj bez zmiany zapytania lub tokenu.

## Przykłady

### curl — jedna strona, wybrane pola

```bash
curl -sS \
  -H "Authorization: Bearer kgd_TWOJ_TOKEN" \
  -H "Accept: application/json" \
  "https://kgd-group.pl/api/v1.php?route=/pages&slug=%2Finwestycja%2Ffoxhills&fields=heroTitle,priceFrom"
```

### curl — wszystkie pola publiczne strony

```bash
curl -sS -H "Authorization: Bearer kgd_TWOJ_TOKEN" \
  "https://kgd-group.pl/api/v1.php?route=/pages&slug=%2Finwestycja%2Ffoxhills"
```

### curl — wszystkie opublikowane strony, partiami po 50

```bash
curl -sS -H "Authorization: Bearer kgd_TWOJ_TOKEN" \
  "https://kgd-group.pl/api/v1.php?route=/pages&limit=50&offset=0"
```

### curl — warunkowe pobranie (ETag)

```bash
# pierwsze zapytanie — zapamiętaj nagłówek ETag
curl -sS -D - -H "Authorization: Bearer kgd_TWOJ_TOKEN" \
  "https://kgd-group.pl/api/v1.php?route=/pages&slug=%2Finwestycja%2Ffoxhills" -o page.json

# kolejne — 304, jeśli nic się nie zmieniło
curl -sS -i -H "Authorization: Bearer kgd_TWOJ_TOKEN" \
  -H 'If-None-Match: W/"5d41402abc4b2a76b9719d911017c592"' \
  "https://kgd-group.pl/api/v1.php?route=/pages&slug=%2Finwestycja%2Ffoxhills"
```

### PowerShell (Windows)

```powershell
$headers = @{ Authorization = "Bearer kgd_TWOJ_TOKEN"; Accept = "application/json" }
$url = "https://kgd-group.pl/api/v1.php?route=/pages&slug=%2Finwestycja%2Ffoxhills&fields=heroTitle,priceFrom"
$response = Invoke-RestMethod -Uri $url -Headers $headers -Method Get
$response.data[0].fields.heroTitle
```

### JavaScript / Node.js (po stronie serwera)

```js
const params = new URLSearchParams({ route: "/pages", slug: "/inwestycja/foxhills", fields: "heroTitle,priceFrom" });
const response = await fetch(`https://kgd-group.pl/api/v1.php?${params}`, {
  headers: { Authorization: `Bearer ${process.env.KGD_API_TOKEN}`, Accept: "application/json" },
});

if (!response.ok) {
  const problem = await response.json(); // application/problem+json
  throw new Error(`${problem.status} ${problem.title}: ${problem.detail}`);
}

const { data } = await response.json();
console.log(data[0]?.fields.heroTitle);
```

### PHP

```php
$query = http_build_query(['route' => '/pages', 'slug' => '/inwestycja/foxhills', 'fields' => 'heroTitle,priceFrom']);
$context = stream_context_create(['http' => [
    'header' => "Authorization: Bearer " . getenv('KGD_API_TOKEN') . "\r\nAccept: application/json\r\n",
    'ignore_errors' => true,
]]);
$body = file_get_contents("https://kgd-group.pl/api/v1.php?{$query}", false, $context);
$json = json_decode($body, true);
echo $json['data'][0]['fields']['heroTitle'] ?? '';
```

### Przykłady błędów

Nieznany parametr (`field` zamiast `fields`):

```json
{
  "type": "https://kgd-group.pl/api/v1/docs#invalid-parameter",
  "title": "Invalid request parameter",
  "status": 400,
  "detail": "One or more query parameters are invalid.",
  "instance": "/api/v1/pages",
  "invalidParams": [
    { "name": "field", "reason": "Unknown parameter. Allowed: slug, fields, limit, offset." }
  ]
}
```

Brak lub zły token:

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="api", error="invalid_token"
Content-Type: application/problem+json; charset=utf-8
```

```json
{
  "type": "https://kgd-group.pl/api/v1/docs#unauthorized",
  "title": "Authentication required",
  "status": 401,
  "detail": "The token is invalid, expired or revoked.",
  "instance": "/api/v1/pages"
}
```

Przekroczony limit:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 23
```

## Dobre praktyki

- **Jeden token na integrację** — wtedy można go cofnąć bez wpływu na inne systemy.
- **Pobieraj tylko potrzebne pola** (`fields=`) — mniejsze odpowiedzi, a dodanie nowych pól publicznych nie zmieni kształtu Twoich danych.
- **Korzystaj z `ETag`** zamiast pobierać wszystko za każdym razem.
- **Obsługuj `null`** w `fields` — pole może zostać wyłączone z API albo strona może go nie mieć.
- **Opieraj logikę błędów na `status` i `type`**, nie na treści `detail`.
- **Zachowuj `X-Request-Id`** z odpowiedzi przy błędach — ułatwia diagnozę po naszej stronie.
