import { unwrap, type EditableValue } from "@/lib/editable";

type Block =
  | { type: "heading"; level?: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; style?: "bullet" | "number"; items: string[] };

type PrivacyPolicyFields = {
  title?: EditableValue<string> | string;
  blocks?: Block[];
};

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const level = block.level ?? 2;
      const className = level <= 2 ? "text-xl font-semibold mt-10 mb-4" : "font-semibold mt-6 mb-2";
      return level <= 2 ? <h2 className={className}>{block.text}</h2> : <h3 className={className}>{block.text}</h3>;
    }
    case "list":
      return block.style === "number" ? (
        <ol className="list-decimal pl-6 space-y-1 mb-4">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc pl-6 space-y-1 mb-4">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "paragraph":
    default:
      return <p className="mb-4">{block.text}</p>;
  }
}

/**
 * Naprawdę globalny szablon (identyczny dla każdej inwestycji) — treść jako
 * strukturalne bloki (heading/paragraph/list), nie surowy HTML, zgodnie z
 * konwencją src/components/sections/RichText.tsx (ochrona przed XSS).
 */
export default function PrivacyPolicy({ fields }: { fields: PrivacyPolicyFields }) {
  const title = unwrap(fields.title) || "Polityka prywatności";
  const blocks = fields.blocks ?? [];

  return (
    <section className="bg-white py-16 pt-[150px]">
      <div className="container mx-auto px-6 text-gray-800 leading-relaxed max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">{title}</h1>
        {blocks.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </div>
    </section>
  );
}
