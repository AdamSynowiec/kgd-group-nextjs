import { test } from "node:test";
import assert from "node:assert/strict";
import { isSafeUrl } from "./sanitizeHtml.ts";

// UWAGA: testowane jest tylko isSafeUrl() — czysta funkcja na stringu.
// sanitizeHtml() sama w sobie zależy od DOMParser (przeglądarkowe API), którego
// Node.js nie ma wbudowanego, a projekt świadomie nie dodaje jsdom (nowa
// zależność) — jej drzewo-przechodzące zachowanie zweryfikowane ręcznie przez
// dev-server, patrz podsumowanie zadania.

test("isSafeUrl accepts http/https/mailto", () => {
  assert.equal(isSafeUrl("https://example.com"), true);
  assert.equal(isSafeUrl("http://example.com/a/b?c=1"), true);
  assert.equal(isSafeUrl("mailto:kontakt@kgd-group.pl"), true);
});

test("isSafeUrl accepts relative/anchor/query links", () => {
  assert.equal(isSafeUrl("/blog/inny-wpis"), true);
  assert.equal(isSafeUrl("#sekcja"), true);
  assert.equal(isSafeUrl("?ref=blog"), true);
  assert.equal(isSafeUrl("./lokalny.html"), true);
  assert.equal(isSafeUrl("podstrona"), true);
});

test("isSafeUrl rejects dangerous schemes", () => {
  assert.equal(isSafeUrl("javascript:alert(1)"), false);
  assert.equal(isSafeUrl("data:text/html,<script>alert(1)</script>"), false);
  assert.equal(isSafeUrl("vbscript:msgbox(1)"), false);
  assert.equal(isSafeUrl("file:///etc/passwd"), false);
});

test("isSafeUrl rejects empty/whitespace", () => {
  assert.equal(isSafeUrl(""), false);
  assert.equal(isSafeUrl("   "), false);
});

test("isSafeUrl is case-insensitive on scheme and tolerates surrounding whitespace", () => {
  assert.equal(isSafeUrl("  HTTPS://example.com  "), true);
  assert.equal(isSafeUrl("JavaScript:alert(1)"), false);
});
