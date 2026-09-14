import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import { FileDownIcon, ArrowRightIcon } from "./icons";

type Guide = { title: string; desc: string; href: string; cta: string };

type KnowledgeFields = {
  eyebrow?: EditableValue<string> | string;
  header: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  guides?: EditableValue<Guide[]> | Guide[];
};

/** Mirror kgd-building/Knowledge.jsx — karty z poradnikami do pobrania. */
export default function Knowledge({ fields }: { fields: KnowledgeFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const guides = unwrap(fields.guides) ?? [];

  return (
    <section id="baza-wiedzy" className="bg-[#FBFBFB] py-16 md:py-20 font-poppins">
      <Container>
        <div className="text-center">
          {eyebrow && <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#C9AB8B]">{eyebrow}</span>}
          <h2 className="mt-3 text-3xl md:text-4xl font-light">{header}</h2>
          {text && <p className="mt-4 text-[#4a4a4a] font-light">{text}</p>}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {guides.map((guide) => (
            <article
              key={guide.title}
              className="group flex flex-col rounded-md bg-white border border-[#eee] p-8 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(201,171,139,0.15)] hover:-translate-y-1"
            >
              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#C9AB8B]/10 text-[#C9AB8B] transition-colors duration-300 group-hover:bg-[#C9AB8B] group-hover:text-white">
                <FileDownIcon />
              </div>

              <h3 className="mt-6 text-xl leading-snug font-light">{guide.title}</h3>
              <p className="mt-3 text-sm text-[#717171]">{guide.desc}</p>

              <a
                href={guide.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center gap-2 self-start rounded-full px-5 py-2.5 font-light tracking-wide text-sm bg-[#C9AB8B] text-white border border-[#C9AB8B] transition-all duration-300 hover:bg-transparent hover:text-[#C9AB8B] hover:shadow-[0_10px_30px_rgba(201,171,139,0.25)]"
              >
                {guide.cta}
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
