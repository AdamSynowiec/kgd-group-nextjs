import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import { CheckIcon } from "./icons";

type Service = { header: string; intro?: string; items: string[] };

type ServiceAreasFields = {
  header: EditableValue<string> | string;
  text?: EditableValue<string> | string;
  services?: EditableValue<Service[]> | Service[];
};

/**
 * Mirror Feature.jsx (kgd-group, 7x w Deweloper.jsx) — tam treść szła jako
 * surowy HTML string (`<ul><li>...`). Tu ustrukturyzowane na {header, items}
 * (bez dangerouslySetInnerHTML — patrz RichText.tsx/home/Card.tsx, ta sama
 * zasada co Process.steps/Benefits.benefits w tym samym projekcie).
 */
export default function ServiceAreas({ fields }: { fields: ServiceAreasFields }) {
  const header = unwrap(fields.header);
  const text = unwrap(fields.text);
  const services = unwrap(fields.services) ?? [];

  return (
    <section id="wsparcie" className="bg-[#FBFBFB] py-16 md:py-20 font-poppins">
      <Container>
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-light">{header}</h2>
          {text && <p className="mt-4 font-semibold text-[#4a4a4a]">{text}</p>}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {services.map((service, i) => (
            <div
              key={service.header}
              className="rounded-md bg-white border border-[#eee] p-6 lg:p-8 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(201,171,139,0.15)] hover:-translate-y-1"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[#C9AB8B]/10 text-[#C9AB8B] text-sm font-medium">
                  {i + 1}
                </span>
                <h3 className="text-lg lg:text-xl font-light">{service.header}</h3>
              </div>

              {service.intro && <p className="text-sm text-[#4a4a4a] mb-4">{service.intro}</p>}

              <ul className="space-y-2.5">
                {service.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[#4a4a4a]">
                    <CheckIcon className="mt-1 h-4 w-4 flex-none text-[#C9AB8B]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
