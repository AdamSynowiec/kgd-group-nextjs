import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import SectionHeading from "./SectionHeading";

type Project = { img: string; title: string; meta: string };

type ProjectsFields = {
  eyebrow?: EditableValue<string> | string;
  header: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  projects?: EditableValue<Project[]> | Project[];
};

/** Siatka realizacji (pierwszy kafelek 2x2), kwadratowe rogi i złota kreska na hover — spójne z kafelkami /wykonczenie-pod-klucz. */
export default function Projects({ fields }: { fields: ProjectsFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const projects = unwrap(fields.projects) ?? [];

  return (
    <section id="realizacje" className="bg-white pb-20 md:pb-28 font-poppins">
      <Container>
        <SectionHeading eyebrow={eyebrow} header={header} text={text} />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          {projects.map((p, idx) => (
            <div key={p.title} className={`group relative block overflow-hidden bg-[#141414] ${idx === 0 ? "lg:col-span-2 lg:row-span-2" : ""}`}>
              <img
                src={p.img}
                alt={p.title}
                loading="lazy"
                className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${idx === 0 ? "aspect-[4/5] lg:aspect-auto" : "aspect-[4/3]"}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <span className="block h-[3px] w-10 bg-[#C9AB8B] transition-all duration-500 group-hover:w-20" />
                <div className="mt-3 text-[11px] tracking-[0.25em] text-white/70 uppercase">{p.meta}</div>
                <div className="mt-1 font-ranade-variable font-light text-[22px] md:text-[26px]">{p.title}</div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
