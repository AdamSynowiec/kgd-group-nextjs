import { test } from "node:test";
import assert from "node:assert/strict";
import { formatHtmlForDisplay } from "./formatHtml.ts";

test("empty input", () => {
  assert.equal(formatHtmlForDisplay(""), "");
  assert.equal(formatHtmlForDisplay("   "), "");
});

test("single paragraph, one line, no indent", () => {
  assert.equal(formatHtmlForDisplay("<p>Witaj świecie</p>"), "<p>Witaj świecie</p>");
});

test("sibling blocks each on their own line, same depth", () => {
  const html = "<h2>Tytuł</h2><p>Akapit</p>";
  assert.equal(formatHtmlForDisplay(html), "<h2>Tytuł</h2>\n<p>Akapit</p>");
});

test("list items indented one level under ul", () => {
  const html = "<ul><li>Raz</li><li>Dwa</li></ul>";
  assert.equal(formatHtmlForDisplay(html), "<ul>\n  <li>Raz</li>\n  <li>Dwa</li>\n</ul>");
});

test("void/self-contained img does not increase indent of following sibling", () => {
  const html = '<p>Tekst</p><img src="/a.jpg" alt="opis"><p>Kolejny</p>';
  assert.equal(
    formatHtmlForDisplay(html),
    '<p>Tekst</p>\n<img src="/a.jpg" alt="opis">\n<p>Kolejny</p>'
  );
});
