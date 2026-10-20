#!/usr/bin/env bash
# Buduje listę wykluczeń dla kroku "Deploy to FTP" (.github/workflows/deploy.yml).
#
# Wejście (łączone): plik .deploy-exclude + zmienna INPUT_EXCLUDE (pole "exclude"
# przy ręcznym uruchomieniu workflow) + SKIP_BLOG=true (dokłada "blog/").
# Wpisy rozdzielone nową linią lub przecinkiem; "#" zaczyna komentarz.
#
# Normalizacja do globów FTP-Deploy-Action (względem out/):
#   /inwestycja/xyz   -> inwestycja/xyz/**     (ścieżka bez rozszerzenia = katalog strony)
#   blog/ , blog/*    -> blog/**               (cały katalog, z podkatalogami)
#   api/**, *.pdf     -> bez zmian             (gotowy glob)
# Zawsze dokłada **/.env (konfiguracja serwera — patrz deploy.yml).
#
# Wypisuje gotową listę (po jednym wzorcu w linii) na stdout. Kończy się błędem
# przy wzorcu, który zepsułby stronę: _next/** (JS/CSS wszystkich stron) albo "wszystko".
set -euo pipefail

collect() {
  if [ -f .deploy-exclude ]; then cat .deploy-exclude; echo; fi
  printf '%s\n' "${INPUT_EXCLUDE:-}"
  if [ "${SKIP_BLOG:-false}" = "true" ]; then echo "blog/"; fi
}

# Najpierw komentarz z każdej linii (może zawierać przecinki), dopiero potem podział po przecinkach.
entries() {
  collect | tr -d '\r' | while IFS= read -r line; do
    printf '%s\n' "${line%%#*}"
  done | tr ',' '\n'
}

echo '**/.env'
seen=" "
while IFS= read -r raw; do
  pattern="$(printf '%s' "$raw" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  [ -z "$pattern" ] && continue
  pattern="${pattern#./}"
  pattern="${pattern#/}"

  case "$pattern" in
    _next|_next/*)
      echo "::error::Nie można wykluczyć \"$pattern\": _next/ to JS i CSS wszystkich stron — nowe strony odwoływałyby się do plików, których nie ma na serwerze." >&2
      exit 1 ;;
    "*" | "**" | "**/*" | "*/**")
      echo "::error::Wzorzec \"$pattern\" wyklucza wszystko — deploy nie miałby sensu." >&2
      exit 1 ;;
  esac

  if [[ "$pattern" == */ ]]; then
    pattern="${pattern}**"
  elif [[ "$pattern" == */\* ]]; then
    pattern="${pattern%\*}**"
  elif [[ "$pattern" != *[\*\?\[]* && "${pattern##*/}" != *.* ]]; then
    pattern="${pattern}/**"
  fi

  case "$seen" in *" $pattern "*) continue ;; esac
  seen="$seen$pattern "
  echo "$pattern"
done < <(entries)
