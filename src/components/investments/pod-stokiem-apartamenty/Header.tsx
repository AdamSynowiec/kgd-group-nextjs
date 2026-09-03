"use client";

import { motion } from "framer-motion";
import Container from "./Container";

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.25 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
} as const;

const lineVariants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: { scaleX: 1, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
} as const;

export default function Header({ heading, subHeading, className = "" }: { heading?: string; subHeading?: string; className?: string }) {
  return (
    <section className={`bg-[#1A1D23] py-[50px] md:py-[100px] ${className}`}>
      <Container>
        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.4 }}>
          {heading && (
            <motion.h1 variants={itemVariants} className="text-[36px] md:text-[46px] text-[#F5F5F5] font-libre-caslon">
              {heading}
            </motion.h1>
          )}

          <motion.div variants={lineVariants} className="h-[2px] bg-[#F5A623] w-16 mt-6 origin-left" />

          {subHeading && (
            <motion.p variants={itemVariants} className="text-[18px]/[35px] md:text-[20px]/[40px] text-[#F5F5F5] mt-[24px] max-w-[1100px] font-roboto font-thin">
              {subHeading}
            </motion.p>
          )}
        </motion.div>
      </Container>
    </section>
  );
}
