"use client";

import { motion } from "framer-motion";
import { unwrap, type EditableValue } from "@/lib/editable";
import Header from "./Header";

type Feature = { icon: string; text: string };

type AboutUsFields = {
  features?: EditableValue<Feature[]> | Feature[];
  overlayHeader?: EditableValue<string> | string;
  overlaySubHeader?: EditableValue<string> | string;
  header?: EditableValue<string> | string;
  subHeader?: EditableValue<string> | string;
  interiorsHeader?: EditableValue<string> | string;
  interiorsSubHeader?: EditableValue<string> | string;
};

const IMG = "/investments/pod-stokiem-apartamenty/vis";

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.2 } } };
const itemVariants = { hidden: { opacity: 0, y: 0 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };
const imageVariants = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8 } } };

export default function AboutUs({ fields }: { fields: AboutUsFields }) {
  const features = unwrap(fields.features) ?? [];
  const overlayHeader = unwrap(fields.overlayHeader);
  const overlaySubHeader = unwrap(fields.overlaySubHeader);
  const header = unwrap(fields.header);
  const subHeader = unwrap(fields.subHeader);
  const interiorsHeader = unwrap(fields.interiorsHeader);
  const interiorsSubHeader = unwrap(fields.interiorsSubHeader);

  return (
    <section className="bg-[#FCFCFC]">
      <div className="relative">
        <motion.div className="max-w-full ml-auto flex flex-row-reverse gap-[50px]" initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
          <motion.img src={`${IMG}/pod-stokiem-apartamenty-02.webp`} alt="" className="w-full relative z-10 shadow-lg" variants={imageVariants} />
        </motion.div>

        <div className="bg-[#FCFCFC]">
          <div className="flex flex-col justify-end lg:absolute inset-0 z-10 lg:bg-gradient-to-t from-[#000]/80 via-[#000]/20 to-[#000]/30">
            <div className="max-w-[1440px] my-[50px] mx-4 lg:ml-[150px] lg:mb-[150px] lg:mr-[150px]">
              {overlayHeader && <h2 className="font-libre-caslon text-3xl lg:text-6xl/[84px] font-bold leading-tight lg:drop-shadow-lg lg:text-white">{overlayHeader}</h2>}
              {overlaySubHeader && <p className="max-w-4xl font-poppins font-light mt-6 text-lg lg:text-2xl/[36px] lg:drop-shadow-lg lg:text-white">{overlaySubHeader}</p>}
            </div>
          </div>
        </div>
      </div>

      <Header heading={header} subHeading={subHeader} />

      <div className="relative bg-[#FCFCFC]">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="relative col-span-8">
            <img loading="lazy" decoding="async" src={`${IMG}/pod-stokiem-apartamenty-03.webp`} alt="" className="w-full h-screen object-cover" />

            <div className="flex flex-col justify-end absolute inset-0 z-10 bg-gradient-to-t from-[#000]/80 via-[#000]/20 to-[#000]/30">
              <div className="max-w-[1440px] mb-[5vw] mx-[5vw] xl:ml-[150px] xl:mb-[150px] xl:mr-[150px]">
                {interiorsHeader && <h2 className="font-libre-caslon text-3xl lg:text-6xl/[84px] font-bold leading-tight drop-shadow-lg text-white">{interiorsHeader}</h2>}
                {interiorsSubHeader && <p className="max-w-4xl font-poppins font-light mt-6 text-lg lg:text-2xl/[36px] drop-shadow-lg text-white">{interiorsSubHeader}</p>}
              </div>
            </div>
          </div>

          <motion.div className="grid grid-cols-2 col-span-4 gap-4 p-4" variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }}>
            {features.map((item) => (
              <motion.div key={item.text} className="aspect-square lg:aspect-auto bg-[#1A1D23] hover:bg-[#1A1D23]/[0.95] transition-all lg:mb-0 text-center flex flex-col items-center justify-center" variants={itemVariants}>
                <div className="md:w-[5vw] md:h-[5vw] flex items-center justify-center mb-[16px]">
                  <img loading="lazy" decoding="async" src={item.icon} alt="" className="w-16 h-16 md:max-w-full md:max-h-full object-contain" />
                </div>
                <div className="h-[2px] bg-[#F5A623] w-16 mb-[16px]" />
                <span className="text-[#FCFCFC] font-roboto font-light text-[18px] lg:text-[21px] max-w-[250px]">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
