import type { JSX } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";

type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; level?: number; text: string }
  | { type: "list"; style?: "bullet" | "number"; items: string[] };

type RichTextFields = {
  eyebrow?: EditableValue<string> | string;
  heading?: EditableValue<string> | string;
  lead?: EditableValue<string> | string;
  blocks?: Block[];
};

/**
 * Treść blokowa. Świadomie NIE przyjmuje HTML-a w stringu — każdy blok
 * ma typ i jest renderowany semantycznie. Chroni to przed XSS i przed
 * rozjechaniem hierarchii nagłówków.
 */
function BlockView({ block, baseLevel }: { block: Block; baseLevel: number }) {
  switch (block.type) {
    case "heading": {
      const Heading = `h${Math.min((block.level ?? 2) + baseLevel - 2, 6)}` as keyof JSX.IntrinsicElements;
      return <Heading className="mt-6 text-xl font-semibold">{block.text}</Heading>;
    }
    case "list":
      return block.style === "number" ? (
        <ol className="mt-4 list-decimal space-y-1 pl-5">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="mt-4 list-disc space-y-1 pl-5">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "paragraph":
    default:
      return <p className="mt-4 leading-7 text-zinc-600">{block.text}</p>;
  }
}

export default function RichText({
  fields,
  headingLevel = 2,
}: {
  fields: RichTextFields;
  headingLevel?: number;
}) {
  const eyebrow = unwrap(fields.eyebrow);
  const heading = unwrap(fields.heading);
  const lead = unwrap(fields.lead);
  const { blocks = [] } = fields;
  const Heading = `h${headingLevel}` as keyof JSX.IntrinsicElements;

  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          {eyebrow}
        </p>
      )}
      {heading && <Heading className="text-2xl font-semibold tracking-tight">{heading}</Heading>}
      {lead && <p className="mt-2 text-lg text-zinc-600">{lead}</p>}

      {blocks.map((block, i) => (
        <BlockView key={`${block.type}-${i}`} block={block} baseLevel={headingLevel + 1} />
      ))}
    </div>
  );
}
