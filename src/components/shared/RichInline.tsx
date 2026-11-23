import { Fragment, type ReactNode } from "react";
import { parseInline, type InlineNode } from "@/lib/richText/inline";

/**
 * Wyświetla wartość pola opisu z formatowaniem z panelu (pogrubienie, kursywa,
 * podkreślenie, link) — wstawiane W MIEJSCE dotychczasowego `{text}` wewnątrz
 * istniejącego <p>/<span> komponentu, więc nie zmienia jego wyglądu.
 *
 * Bezpieczne z definicji: nie używa dangerouslySetInnerHTML. Treść przechodzi przez
 * parseInline() (biała lista tagów i adresów, patrz src/lib/richText/inline.ts),
 * a wynik to elementy React — tekst jest escapowany, atrybuty ustawiamy sami.
 * Linki dziedziczą kolor tekstu (działa na jasnym i ciemnym tle), są podkreślone.
 */
export default function RichInline({ value, linkClassName = "" }: { value: unknown; linkClassName?: string }) {
  if (typeof value !== "string" || value === "") return null;
  return <>{render(parseInline(value), linkClassName)}</>;
}

function render(nodes: InlineNode[], linkClassName: string): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return <Fragment key={index}>{node.text}</Fragment>;
      case "br":
        return <br key={index} />;
      case "strong":
        return (
          <strong key={index} className="font-semibold">
            {render(node.children, linkClassName)}
          </strong>
        );
      case "em":
        return <em key={index}>{render(node.children, linkClassName)}</em>;
      case "u":
        return <u key={index}>{render(node.children, linkClassName)}</u>;
      case "a":
        return (
          <a
            key={index}
            href={node.href}
            {...(node.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className={`underline underline-offset-[3px] transition-opacity hover:opacity-75 ${linkClassName}`}
          >
            {render(node.children, linkClassName)}
          </a>
        );
    }
  });
}
