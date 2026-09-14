import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Project = { img: string; title: string; meta: string };

type ProjectsFields = {
  eyebrow?: EditableValue<string> | string;
  header: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  projects?: EditableValue<Project[]> | Project[];
};

/** Mirror kgd-building/Projects.jsx — siatka realizacji, pierwszy kafelek 2x2. */
export default function Projects({ fields }: { fields: ProjectsFields }) {
  const eyebrow = unwrap(fields.eyebrow);
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const projects = unwrap(fields.projects) ?? [];

  return (
    <section id="realizacje" className="py-16 md:py-20 font-poppins">
      <Container>
        <div className="text-center">
          {eyebrow && <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#C9AB8B]">{eyebrow}</span>}
          <h2 className="mt-3 text-3xl md:text-4xl font-light">{header}</h2>
          {text && <p className="mt-4 text-[#4a4a4a] font-light">{text}</p>}
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          {projects.map((p, idx) => (
            <div
              key={p.title}
              className={`group relative block overflow-hidden rounded-md bg-[#FBFBFB] ${idx === 0 ? "lg:col-span-2 lg:row-span-2" : ""}`}
            >
              <img
                src={p.img}
                alt={p.title}
                loading="lazy"
                className={`h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${
                  idx === 0 ? "aspect-[4/5] lg:aspect-auto" : "aspect-[4/3]"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent transition-opacity duration-300 group-hover:from-black/80" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <div className="text-xs tracking-[0.2em] text-white/80 uppercase">{p.meta}</div>
                <div className="mt-1 text-lg font-medium">{p.title}</div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
