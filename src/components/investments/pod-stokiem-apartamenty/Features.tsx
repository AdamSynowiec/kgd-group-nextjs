"use client";

import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";

type Feature = { icon: string; text: string };

type FeaturesFields = {
  features?: EditableValue<Feature[]> | Feature[];
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 0 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function Features({ fields }: { fields: FeaturesFields }) {
  const features = unwrap(fields.features) ?? [];

  return (
    <div id="inwestycja" className="bg-[#FCFCFC]">
      <div className="px-4 md:px-[32px]">
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-3 lg:grid-cols-5 py-4 lg:py-[32px] gap-4 lg:gap-[32px]"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
        >
          {features.map((item) => (
            <motion.div
              key={item.text}
              className="aspect-square bg-[#1A1D23] hover:bg-[#1A1D23]/[0.95] transition-all text-center flex flex-col items-center justify-center"
              variants={itemVariants}
            >
              <div className="md:w-[5vw] md:h-[5vw] mb-[24px] flex items-center justify-center">
                <img loading="lazy" decoding="async" src={item.icon} alt="" className="w-16 h-16 md:max-w-full md:max-h-full object-contain" />
              </div>
              <div className="h-[2px] bg-[#F5A623] w-16 mb-[16px]" />
              <span className="text-[#FCFCFC] font-roboto font-light text-[18px] lg:text-[21px] max-w-[250px]">{item.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
