/**
 * Build bez stron wpisów bloga — ustawiane przez CI (.github/workflows/deploy.yml,
 * zmienna SKIP_BLOG_BUILD=1) przy deployu po zwykłym pushu na main, kiedy blog i
 * tak nie jest wgrywany na FTP (wpisy dodaje zewnętrzny system przez ingest.php i
 * sam zleca pełny build). Trasy bloga generują wtedy tylko swój placeholder
 * (notFound), więc build nie pobiera ani nie renderuje ~220 wpisów.
 */
export function isBlogBuildSkipped(): boolean {
  return process.env.SKIP_BLOG_BUILD === "1";
}
