"use client";

import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Container from "./Container";

type Feature = { icon: string; text: string };

type AboutUsFields = {
  header: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
  features?: EditableValue<Feature[]> | Feature[];
};

export default function AboutUs({ fields }: { fields: AboutUsFields }) {
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);
  const features = unwrap(fields.features) ?? [];

  return (
    <section id="inwestycja" className="pt-[50px] md:pt-[100px] bg-[#FCFCFC]">
      <Container>
        <div className="mb-[100px]">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-ranade-variable text-[32px] md:text-[64px] mb-[24px]"
          >
            {header}
          </motion.h2>
          {subHeader && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="font-ranade-variable font-thin text-[18px] md:text-[24px]"
            >
              {subHeader}
            </motion.p>
          )}
        </div>
      </Container>

      <div className="bg-[#1D1D1D] py-[50px] md:py-[100px]">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            {features.map((item, i) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-[#212121] py-8 border border-[#212121] rounded-md text-center flex flex-col items-center justify-start"
              >
                <div className="w-[120px] h-[120px] mb-4 flex items-center justify-center">
                  <img loading="lazy" decoding="async" src={item.icon} alt="" className="max-w-1/2 max-h-full object-contain" />
                </div>
                <span className="font-ranade-variable font-thin text-[18px] md:text-[20px] text-white">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </Container>
      </div>
    </section>
  );
}
