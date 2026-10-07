"use client";

import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";
import { AwardIcon, LayersIcon, UsersIcon, TagIcon } from "./icons";

type Highlight = { icon: string; header: string; content: string };

type HighlightsFields = {
  header?: EditableValue<string> | string;
  items?: EditableValue<Highlight[]> | Highlight[];
};

const iconMap: Record<string, typeof AwardIcon> = { award: AwardIcon, layers: LayersIcon, users: UsersIcon, tag: TagIcon };

/** Pas "przewag" KGD — płaska, dzielona siatka statystyk (mirror statCards na stronie głównej), bez kart. */
export default function Highlights({ fields }: { fields: HighlightsFields }) {
  const header = unwrap(fields.header);
  const items = unwrap(fields.items) ?? [];

  return (
    <section id="przewagi" className="relative py-20 md:py-24 font-poppins bg-white">
      <Container>
        {header && (
          <div className="flex items-center gap-4 mb-14">
            <span className="text-[11px] uppercase tracking-[0.25em] text-black/40 flex-none">{header}</span>
            <div className="h-px flex-1 bg-black/10" />
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/[0.08] border border-black/[0.08]">
          {items.map((item, index) => {
            const Icon = iconMap[item.icon] ?? AwardIcon;
            return (
              <motion.div
                key={item.header}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="group flex flex-col items-center text-center px-6 py-12 transition-colors duration-500 hover:bg-[#FBFBFB]"
              >
                <Icon className="h-6 w-6 text-[#C9AB8B]/70 transition-colors duration-500 group-hover:text-[#C9AB8B]" />
                <span className="mt-6 font-ranade-variable font-light text-[22px] md:text-[26px] leading-tight">{item.header}</span>
                <p className="mt-3 text-[13px] text-black/45 font-light leading-relaxed max-w-[220px]">{item.content}</p>
              </motion.div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
