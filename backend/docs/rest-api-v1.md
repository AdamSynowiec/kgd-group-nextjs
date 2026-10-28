# REST API v1 (odczyt treści serwisu)

API do odczytu treści opublikowanych stron serwisu, przeznaczone dla zewnętrznych systemów (serwer–serwer). Zwraca wyłącznie **pola publiczne** — te, które administrator świadomie udostępnił (patrz [Pola publiczne](#pola-publiczne)).

Ta dokumentacja jest dostępna pod `https://kgd-group.pl/api/v1/docs`. Specyfikacja maszynowa (OpenAPI 3.1, do wygenerowania klienta albo importu do Swagger UI / Postmana): [`openapi.yaml`](api-v1.openapi.yaml) — `https://kgd-group.pl/api/v1/openapi.yaml`. Oba adresy są publiczne (bez tokenu).

## Spis treści

- [Szybki start](#szybki-start)
- [Adres API](#adres-api)
- [Autoryzacja](#autoryzacja)
- [Model danych: strona, typ, rodzic](#model-danych-strona-typ-rodzic)
- [Pola publiczne](#pola-publiczne)
- [GET /](#get-)
- [GET /pages](#get-pages)
- [GET /pages/{strona}](#get-pagesstrona)
- [GET /types](#get-types)
- [Synchronizacja zmian](#synchronizacja-zmian)
- [Cache i ETag](#cache-i-etag)
- [Limit zapytań](#limit-zapytań)
- [Błędy](#błędy)
- [Przykłady w językach](#przykłady-w-językach)
- [Dobre praktyki](#dobre-praktyki)

## Szybki start

1. Administrator tworzy token: **Ustawienia → Tokeny API** (zakres `pages:read`) i przekazuje go bezpiecznym kanałem.
2. Administrator klika tam **„Nadaj brakujące”** w sekcji „Identyfikatory i typy stron” — każda strona dostaje identyfikator (np. `rudava-park`) i typ (np. `inwestycja`). Można je potem zmienić w edytorze strony (panel „Publikacja”).
3. Administrator nadaje **identyfikatory polom**, które mają być dostępne (np. `heroTitle`) — w edytorze strony menu **⋯** przy polu → „Identyfikator pola”.
4. Wywołanie:

```bash
curl -H "Authorization: Bearer kgd_TWOJ_TOKEN" "https://kgd-group.pl/api/v1/pages?type=inwestycja&fields=heroTitle"
```

## Adres API

| Forma | Adres bazowy | Przykład |
|---|---|---|
| Podstawowa | `https://kgd-group.pl/api/v1` | `/api/v1/pages/rudava-park` |
| Zapasowa | `https://kgd-group.pl/api/v1.php?route=` | `/api/v1.php?route=/pages/rudava-park&fields=heroTitle` |

Obie formy działają identycznie; linki w odpowiedziach mają tę formę, którą przyszło zapytanie. Forma zapasowa jest na wypadek, gdyby serwer przestał przepisywać ładne adresy (404 ze strony serwera, nie w formacie API).

- Wymagane jest **HTTPS** — żądanie przez `http://` jest odrzucane (403).
- Wersja API jest częścią adresu (`v1`). Zmiany niezgodne wstecz pojawią się wyłącznie w nowej wersji (`v2`). W `v1` mogą dochodzić **nowe pola w odpowiedziach** i nowe parametry — klient musi ignorować pola, których nie zna.
- Tylko odczyt: metody `GET` i `HEAD` (same nagłówki). Inne metody → 405.
- API nie obsługuje CORS — wywołuj je z serwera, nigdy z przeglądarki (token nie może trafić do kodu po stronie klienta).

## Autoryzacja

Każde żądanie musi mieć nagłówek:

| Nagłówek | Wartość | Wymagany |
|---|---|---|
| `Authorization` | `Bearer <TOKEN>` | tak |
| `Accept` | `application/json` | zalecany |
| `If-None-Match` | wartość `ETag` z poprzedniej odpowiedzi | nie (patrz [Cache i ETag](#cache-i-etag)) |

**Token:**

- Ma postać `kgd_` + 48 znaków. Jest widoczny **tylko raz**, w chwili utworzenia — serwer przechowuje wyłącznie jego skrót; zagubionego tokenu nie da się odzyskać.
- Ma **zakres** (uprawnienia). Każdy endpoint wymaga konkretnego zakresu:

| Zakres | Pozwala na |
|---|---|
| `pages:read` | Odczyt opublikowanych stron, ich pól publicznych i typów (`GET /`, `/pages`, `/pages/{strona}`, `/types`) |

- Może mieć **datę wygaśnięcia** i może zostać **cofnięty** w panelu — działa to natychmiast.
- Przekazuj go wyłącznie w nagłówku, nigdy w adresie URL. Nie zapisuj go w logach ani w repozytorium kodu.

## Model danych: strona, typ, rodzic

Każda treść serwisu to **strona** (`page`). Strona w API ma:

| Pole | Przykład | Znaczenie |
|---|---|---|
| `id` | `"7"` | Numeryczne id. Nadawane automatycznie, nigdy się nie zmienia |
| `key` | `"rudava-park"` | **Identyfikator** nadany w panelu. Unikalny w serwisie, niezależny od adresu strony. `null`, jeśli nie nadano |
| `type` | `"inwestycja"` | **Typ treści** — wspólny dla stron tego samego rodzaju (`inwestycja`, `historia-cen`, `blog`, `page`…). `null`, jeśli nie nadano |
| `slug` | `"/inwestycja/rudava-park"` | Adres strony w serwisie (może się zmienić — nie używaj go jako klucza) |
| `url` | `"https://kgd-group.pl/inwestycja/rudava-park/"` | Pełny adres strony w serwisie |
| `parent` | `{ "id": "7", "key": "rudava-park", … }` | Strona nadrzędna albo `null` (patrz niżej) |
| `createdAt`, `updatedAt` | `"2026-10-13T17:00:00Z"` | Utworzenie i ostatnia zmiana, ISO 8601 w UTC |
| `fields` | `{ "heroTitle": "…" }` | Pola publiczne (patrz [Pola publiczne](#pola-publiczne)) |
| `children` | `[ … ]` | Podstrony — tylko z `include=children` |
| `links` | `{ "self": "…", "children": "…" }` | Adresy tej strony i jej podstron w API |

**Typy i identyfikatory nie są zapisane w kodzie API** — to dane stron. Listę typów, które faktycznie istnieją, i ich pola zwraca [`GET /types`](#get-types).

**Rodzic** to najbliższa opublikowana strona nadrzędna w strukturze adresów: dla `/inwestycja/rudava-park/historia-cen` jest nim `/inwestycja/rudava-park`. Dzięki temu podstronę znajdziesz bez znajomości jej identyfikatora: `GET /pages?parent=rudava-park&type=historia-cen`.

`parent` i `children` zawierają skróconą postać strony — `id`, `key`, `type`, `slug` i `links.self`; pełną stronę pobierasz z `links.self`.

## Pola publiczne

Przez API dostępne są **tylko pola, którym administrator nadał identyfikator** — w edytorze strony: menu **⋯** przy polu → „Identyfikator pola” (nadany identyfikator widać przy nazwie pola jako `#heroTitle`). Pole bez identyfikatora dla API nie istnieje.

- Identyfikator to stały kontrakt: nie zmienia się przy przebudowie strony, zmianie kolejności sekcji ani etykiet.
- Format: litery, cyfry i `_`, zaczyna się od litery, maks. 64 znaki (np. `heroTitle`, `price_from`). Wielkość liter ma znaczenie.
- Unikalny w obrębie strony. Strony jednego typu powinny używać tych samych identyfikatorów dla analogicznych pól (np. `heroTitle` na każdej inwestycji) — [`GET /types`](#get-types) pokazuje, na ilu stronach typu pole występuje.

**Typy wartości:**

| Pole w panelu | Wartość w API | Przykład |
|---|---|---|
| Tekst | `string` | `"Rudava Park"` |
| Tekst sformatowany | `string` z HTML | `"<p>Domy <strong>pod Krakowem</strong></p>"` |
| Liczba | `number` | `9800` |
| Przełącznik | `boolean` | `true` |
| Zdjęcie / plik | `string` — **pełny adres URL** | `"https://kgd-group.pl/api/uploads/3f9a….webp"` |
| Tabela | `array` obiektów (wiersz = obiekt, kolumna = klucz) | `[{ "unit": "A.1.03", "price": 531160 }]` |
| Lista | `array` | `["Basen", "Siłownia"]` |

Wartości są zwracane tak, jak wpisano je w panelu (np. cena w kolumnie tekstowej może mieć postać `"2 512 750 zł"`). Kluczy technicznych tabel (zaczynających się od `_`) API nie zwraca.

## GET /

Punkt wejścia — adresy dostępnych zasobów. Integracja może zaczynać od niego zamiast składać adresy samodzielnie.

```json
{
  "links": {
    "pages": "/api/v1/pages",
    "types": "/api/v1/types",
    "docs": "/api/v1/docs",
    "openapi": "/api/v1/openapi.yaml"
  }
}
```

## GET /pages

Kolekcja **opublikowanych** stron (szkice nigdy nie są zwracane) z filtrowaniem, sortowaniem i stronicowaniem.

```http
GET /api/v1/pages?type=inwestycja&fields=heroTitle,priceFrom&sort=-updatedAt&limit=20 HTTP/1.1
Host: kgd-group.pl
Authorization: Bearer kgd_TWOJ_TOKEN
Accept: application/json
```

### Parametry

| Parametr | Przykład | Opis |
|---|---|---|
| `type` | `inwestycja` lub `inwestycja,blog` | Tylko strony tych typów. Nieistniejący typ → 400 z listą dostępnych |
| `parent` | `rudava-park` lub `7` | Tylko bezpośrednie podstrony tej strony (identyfikator albo id). Nieistniejąca strona → 400 |
| `slug` | `inwestycja/rudava-park` | Tylko strona o tym adresie w serwisie (ukośnik na początku opcjonalny, nie trzeba go kodować) |
| `updatedSince` | `2026-10-26T00:00:00Z` lub `2026-10-26` | Tylko strony zmienione **w tej chwili lub później** (RFC 3339; sama data = północ UTC) |
| `sort` | `-updatedAt` lub `type,slug` | Sortowanie po `id`, `key`, `type`, `slug`, `createdAt`, `updatedAt`; `-` = malejąco, kilka po przecinku. Domyślnie `slug`. Puste wartości zawsze na końcu |
| `fields` | `heroTitle,priceFrom` | Tylko te pola publiczne (maks. 100). Pole, którego strona nie ma → `null`. Bez parametru — wszystkie pola publiczne |
| `include` | `children` | Dołącz skróconą listę podstron (`children`) |
| `limit` | `50` | Liczba stron w odpowiedzi, `1`–`100`, domyślnie `20` |
| `offset` | `50` | Ile stron pominąć, domyślnie `0` |

- Filtry łączą się przez „i” (`type=historia-cen&parent=rudava-park` = historia cen tej inwestycji).
- **Nieznany lub niepoprawny parametr → 400** z listą błędów (`invalidParams`) — literówka nie zwraca po cichu innego wyniku.
- Filtr, który nic nie znalazł, to **200 z pustym `data`**.

### Odpowiedź 200

```json
{
  "data": [
    {
      "id": "7",
      "key": "rudava-park",
      "type": "inwestycja",
      "slug": "/inwestycja/rudava-park",
      "url": "https://kgd-group.pl/inwestycja/rudava-park/",
      "parent": null,
      "createdAt": "2026-09-03T14:32:30Z",
      "updatedAt": "2026-10-13T17:00:00Z",
      "fields": { "heroTitle": "Rudava Park", "priceFrom": 9800 },
      "links": {
        "self": "/api/v1/pages/rudava-park",
        "children": "/api/v1/pages?parent=rudava-park"
      }
    }
  ],
  "meta": { "total": 9, "count": 1, "limit": 1, "offset": 0 },
  "links": {
    "self": "/api/v1/pages?offset=0&limit=1&type=inwestycja&fields=heroTitle%2CpriceFrom",
    "next": "/api/v1/pages?offset=1&limit=1&type=inwestycja&fields=heroTitle%2CpriceFrom",
    "prev": null
  }
}
```

| Pole | Opis |
|---|---|
| `data[]` | Strony — patrz [model danych](#model-danych-strona-typ-rodzic) |
| `meta.total` | Liczba wszystkich stron spełniających filtry |
| `meta.count` | Liczba stron w tej odpowiedzi |
| `links.next` / `prev` | Następna / poprzednia porcja wyników (`null`, gdy nie ma). Przechodź po `links.next`, aż będzie `null` |

## GET /pages/{strona}

Jedna opublikowana strona. `{strona}` to **identyfikator** (`rudava-park`) albo **numeryczne id** (`7`). Zalecany jest identyfikator — czytelny i niezależny od adresu strony.

Parametry: `fields`, `include` (jak w `GET /pages`). Inny parametr → 400. Brak strony albo szkic → **404**.

```http
GET /api/v1/pages/rudava-park?include=children&fields=heroTitle,priceFrom HTTP/1.1
```

```json
{
  "data": {
    "id": "7",
    "key": "rudava-park",
    "type": "inwestycja",
    "slug": "/inwestycja/rudava-park",
    "url": "https://kgd-group.pl/inwestycja/rudava-park/",
    "parent": null,
    "createdAt": "2026-09-03T14:32:30Z",
    "updatedAt": "2026-10-13T17:00:00Z",
    "fields": { "heroTitle": "Rudava Park", "priceFrom": 9800 },
    "children": [
      { "id": "8", "key": "rudava-park-historia-cen", "type": "historia-cen", "slug": "/inwestycja/rudava-park/historia-cen", "links": { "self": "/api/v1/pages/rudava-park-historia-cen" } },
      { "id": "9", "key": "rudava-park-polityka-prywatnosci", "type": "polityka-prywatnosci", "slug": "/inwestycja/rudava-park/polityka-prywatnosci", "links": { "self": "/api/v1/pages/rudava-park-polityka-prywatnosci" } }
    ],
    "links": {
      "self": "/api/v1/pages/rudava-park",
      "children": "/api/v1/pages?parent=rudava-park"
    }
  }
}
```

## GET /types

Typy treści, które istnieją w serwisie, i pola publiczne stron każdego typu — wyliczane z opublikowanych stron, więc zawsze aktualne. Bez parametrów.

```json
{
  "data": [
    {
      "key": "inwestycja",
      "count": 9,
      "fields": [
        { "key": "heroImage", "label": "Zdjęcie główne", "type": "asset", "pages": 9 },
        { "key": "heroTitle", "label": "Nagłówek", "type": "text", "pages": 9 },
        { "key": "units", "label": "Lokale", "type": "table", "columns": ["unit", "area", "status", "price"], "pages": 7 }
      ],
      "links": { "pages": "/api/v1/pages?type=inwestycja" }
    }
  ]
}
```

| Pole | Opis |
|---|---|
| `key` | Typ — wartość do filtra `type` |
| `count` | Liczba opublikowanych stron tego typu |
| `fields[].key` | Identyfikator pola (do `fields=`) |
| `fields[].label` | Nazwa pola w panelu |
| `fields[].type` | Typ pola w panelu (`text`, `richtext`, `number`, `boolean`, `asset`, `table`…) |
| `fields[].columns` | Kolumny tabeli (klucze obiektów wiersza) |
| `fields[].pages` | Na ilu stronach typu pole występuje. `pages` = `count` → pole jest na każdej stronie typu |

## Synchronizacja zmian

Do utrzymywania kopii danych po swojej stronie nie pobieraj wszystkiego za każdym razem:

1. Pierwsze pobranie: `GET /pages?sort=updatedAt&limit=100`, przechodząc po `links.next`.
2. Zapamiętaj największe `updatedAt` z odpowiedzi.
3. Kolejne pobrania: `GET /pages?updatedSince=<zapamiętane updatedAt>&sort=updatedAt`.

`updatedSince` obejmuje też strony zmienione dokładnie w tej sekundzie — tę samą stronę możesz dostać ponownie; rozpoznawaj ją po `id`. Usunięcia lub cofnięcia publikacji wykrywasz okresowym pełnym pobraniem samych identyfikatorów (np. `fields=` jednego pola i `limit=100`).

## Cache i ETag

Każda udana odpowiedź ma nagłówek `ETag`. Wyślij go przy kolejnym zapytaniu w `If-None-Match`:

- treść się nie zmieniła → **`304 Not Modified`** bez treści (użyj zapamiętanej wersji),
- treść się zmieniła → `200` z nową treścią i nowym `ETag`.

`Cache-Control: private, no-cache` — możesz trzymać odpowiedź u siebie, ale przed użyciem sprawdź ją przez `If-None-Match`. Zapytania kończące się `304` też liczą się do limitu.

## Limit zapytań

- **120 zapytań na minutę na token.**
- Nagłówki w każdej odpowiedzi: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` (sekundy do odnowienia).
- Po przekroczeniu: **`429 Too Many Requests`** z nagłówkiem `Retry-After` (sekundy).

## Błędy

Format **Problem Details (RFC 9457)**, `Content-Type: application/problem+json`:

```json
{
  "type": "https://kgd-group.pl/api/v1/docs#invalid-parameter",
  "title": "Invalid request parameter",
  "status": 400,
  "detail": "One or more query parameters are invalid.",
  "instance": "/api/v1/pages",
  "invalidParams": [
    { "name": "type", "reason": "Unknown value(s): inwestycje. Allowed: blog, historia-cen, inwestycja, page, polityka-prywatnosci." },
    { "name": "sort", "reason": "Cannot sort by \"price\". Allowed: id, key, type, slug, createdAt, updatedAt (prefix \"-\" for descending)." }
  ]
}
```

Opieraj obsługę błędów na `status` i `type` (część po `#`), nie na treści `detail`.

| Status | `type` | Kiedy | Co zrobić |
|---|---|---|---|
| 400 | <a id="invalid-parameter"></a>`invalid-parameter` | Niepoprawny lub nieznany parametr; lista w `invalidParams` | Popraw zapytanie |
| 401 | <a id="unauthorized"></a>`unauthorized` | Brak tokenu, token zły, wygasły albo cofnięty (`WWW-Authenticate: Bearer … error="invalid_token"`) | Sprawdź token / poproś o nowy |
| 403 | <a id="insufficient-scope"></a>`insufficient-scope` | Token bez wymaganego zakresu (`requiredScope`) | Poproś o token z zakresem |
| 403 | <a id="insecure-transport"></a>`insecure-transport` | Żądanie przez `http://` | Użyj `https://` |
| 404 | <a id="not-found"></a>`not-found` | Nie ma takiego endpointu albo opublikowanej strony o tym identyfikatorze / id | Sprawdź adres |
| 405 | <a id="method-not-allowed"></a>`method-not-allowed` | Metoda inna niż `GET`/`HEAD` (nagłówek `Allow`) | Użyj `GET` |
| 429 | <a id="rate-limited"></a>`rate-limited` | Przekroczony limit (`Retry-After`) | Odczekaj i ponów |
| 500 | <a id="internal-error"></a>`internal-error` | Nieoczekiwany błąd serwera | Ponów później; zgłoś z `X-Request-Id` |

**Ponawianie:** tylko `429` (po `Retry-After`) i `5xx` (rosnący odstęp: 1 s, 2 s, 4 s, maks. 3–5 prób). Innych `4xx` nie ponawiaj bez zmiany zapytania lub tokenu.

## Przykłady w językach

### curl

```bash
# wszystkie inwestycje, wybrane pola
curl -sS -H "Authorization: Bearer kgd_TWOJ_TOKEN" \
  "https://kgd-group.pl/api/v1/pages?type=inwestycja&fields=heroTitle,priceFrom"

# historia cen jednej inwestycji
curl -sS -H "Authorization: Bearer kgd_TWOJ_TOKEN" \
  "https://kgd-group.pl/api/v1/pages?parent=rudava-park&type=historia-cen"

# warunkowe pobranie — 304, jeśli nic się nie zmieniło
curl -sS -i -H "Authorization: Bearer kgd_TWOJ_TOKEN" \
  -H 'If-None-Match: W/"5d41402abc4b2a76b9719d911017c592"' \
  "https://kgd-group.pl/api/v1/pages/rudava-park"
```

### PowerShell

```powershell
$headers = @{ Authorization = "Bearer kgd_TWOJ_TOKEN"; Accept = "application/json" }
$page = Invoke-RestMethod -Uri "https://kgd-group.pl/api/v1/pages/rudava-park?fields=heroTitle" -Headers $headers
$page.data.fields.heroTitle
```

### JavaScript / Node.js (po stronie serwera)

```js
const api = async (path) => {
  const response = await fetch(`https://kgd-group.pl/api/v1${path}`, {
    headers: { Authorization: `Bearer ${process.env.KGD_API_TOKEN}`, Accept: "application/json" },
  });
  if (!response.ok) {
    const problem = await response.json(); // application/problem+json
    throw new Error(`${problem.status} ${problem.title}: ${problem.detail}`);
  }
  return response.json();
};

// wszystkie inwestycje — przechodząc po kolejnych porcjach
let next = "/pages?type=inwestycja&fields=heroTitle,priceFrom&limit=100";
while (next) {
  const page = await api(next);
  for (const item of page.data) console.log(item.key, item.fields.heroTitle);
  next = page.links.next?.replace(/^\/api\/v1/, "") ?? null;
}
```

### PHP

```php
$context = stream_context_create(['http' => [
    'header' => "Authorization: Bearer " . getenv('KGD_API_TOKEN') . "\r\nAccept: application/json\r\n",
    'ignore_errors' => true,
]]);
$json = json_decode(file_get_contents('https://kgd-group.pl/api/v1/pages/rudava-park?fields=heroTitle', false, $context), true);
echo $json['data']['fields']['heroTitle'] ?? '';
```

## Dobre praktyki

- **Adresuj strony identyfikatorem (`key`) lub `id`**, nigdy adresem (`slug`) — adres w serwisie może się zmienić.
- **Szukaj podstron filtrami** (`parent` + `type`) zamiast składać ich identyfikatory.
- **Pobieraj tylko potrzebne pola** (`fields=`).
- **Ignoruj nieznane pola** w odpowiedziach — w `v1` mogą dochodzić nowe.
- **Obsługuj `null`** w `fields`, `key`, `type` i `parent`.
- **Korzystaj z `ETag` i `updatedSince`** zamiast pobierać wszystko za każdym razem.
- **Jeden token na integrację**; zachowuj `X-Request-Id` z odpowiedzi przy błędach.
