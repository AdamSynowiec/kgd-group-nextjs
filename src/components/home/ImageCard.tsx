"use client";

import { Fragment, useEffect, useRef } from "react";
import H3 from "./H3";
import P from "./P";

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export default function ImageCard({ src, title, subtitle }: { src: string; title: string; subtitle: string }) {
  const containerRef = useRef<HTMLElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const current = useRef(0);
  const target = useRef(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const isMobile = window.innerWidth < 768;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let containerTop = 0;
    let containerHeight = 0;

    const measure = () => {
      const rect = container.getBoundingClientRect();
      containerTop = rect.top + window.scrollY;
      containerHeight = rect.height;
    };

    const update = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const progress = (scrollY + windowHeight - containerTop) / (windowHeight + containerHeight);
      const clamped = clamp(progress, 0, 1);
      const strength = isMobile ? 120 : 300;
      target.current = (clamped - 0.5) * strength;
    };

    const animate = () => {
      current.current = lerp(current.current, target.current, 0.08);
      img.style.transform = `translate3d(0, ${current.current}px, 0) scale(1.08)`;
      raf.current = requestAnimationFrame(animate);
    };

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          update();
          ticking = false;
        });
      }
    };
    const onResize = () => {
      measure();
      update();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    measure();
    update();
    animate();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <section ref={containerRef} className="group py-16 md:py-[100px]">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-8">
          <div className="overflow-hidden rounded-[28px] md:rounded-[40px]">
            <img
              loading="lazy"
              decoding="async"
              ref={imgRef}
              src={src}
              alt=""
              className="w-full aspect-[4/3] md:aspect-square object-cover will-change-transform transition-[filter] duration-700 group-hover:brightness-110"
              style={{ transform: "translate3d(0,0,0) scale(1.08)" }}
            />
          </div>
        </div>

        <div className="md:col-span-4 flex flex-col justify-center">
          <H3 className="text-white md:text-[#C9AB8B] md:bg-white md:p-6 md:p-10 relative z-20 md:mt-6 md:-mt-10 ml-0 md:-ml-60 transition-all duration-700 md:group-hover:translate-x-2">
            {title.split("\n").map((line, i) => (
              <Fragment key={i}>
                {line}
                <br />
              </Fragment>
            ))}
          </H3>

          <P className="mt-4 md:pl-0 text-white md:text-black/70 opacity-80 transition-all duration-700 md:group-hover:opacity-100 md:group-hover:translate-x-1">{subtitle}</P>
        </div>
      </div>
    </section>
  );
}
