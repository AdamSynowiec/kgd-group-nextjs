import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyFieldType } from "./fieldType.ts";

test("bool/number scalars", () => {
  assert.equal(classifyFieldType(true), "bool");
  assert.equal(classifyFieldType(false), "bool");
  assert.equal(classifyFieldType(1), "number");
  assert.equal(classifyFieldType(18900), "number");
});

test("plain string", () => {
  assert.equal(classifyFieldType("Witaj na naszej stronie"), "string");
  assert.equal(classifyFieldType(""), "string");
});

test("asset by extension", () => {
  assert.equal(classifyFieldType("/investments/morelife-apartments/hero-about.jpg"), "asset");
  assert.equal(classifyFieldType("/investments/x/logo.svg"), "asset");
  assert.equal(classifyFieldType("/x/pic.webp?v=2"), "asset");
});

test("asset by empty value + label hint", () => {
  assert.equal(classifyFieldType("", "Zdjęcie hero"), "asset");
  assert.equal(classifyFieldType("", "Logo"), "asset");
  assert.equal(classifyFieldType("", "Tytuł w sekcji hero"), "string");
});

test("array of primitives -> table (villaverde nav tabs / pylna bullet list)", () => {
  assert.equal(
    classifyFieldType(["Start", "Inwestycja", "Plan Zagospodarowania", "Oferta domów"]),
    "table"
  );
});

test("array of flat objects -> table (apartments/rows/menu/gallery)", () => {
  assert.equal(
    classifyFieldType([
      { unit: "M 11-1", rooms: "4", area: "91.32 m²", price: "1 725 948 zł", status: "Wolny", images: [] },
    ]),
    "table"
  );
  assert.equal(classifyFieldType([{ label: "O inwestycji", to: "#o-inwestycji" }]), "table");
  assert.equal(classifyFieldType([{ path: "/investments/x/gallery/001.jpg" }]), "table");
});

test("empty array -> table", () => {
  assert.equal(classifyFieldType([]), "table");
});

test("flat string->string dictionary -> table (errors/placeholders/fieldLabels)", () => {
  assert.equal(
    classifyFieldType({
      name: "Podaj imię i nazwisko",
      emailRequired: "Podaj adres email",
      emailInvalid: "Niepoprawny adres email",
    }),
    "table"
  );
});

test("two-level scalar dictionary -> table (consents)", () => {
  assert.equal(
    classifyFieldType({
      consent: { label: "* Wyrażam zgodę...", details: "Przez {{company}}..." },
      consentEmail: { label: "* Wyrażam zgodę na email", details: "Zgodnie z art. 10..." },
    }),
    "table"
  );
});
