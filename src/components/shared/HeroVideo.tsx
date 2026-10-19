"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Wideo w tle Hero, dociągane dopiero po zdarzeniu `load` strony. Do tego
 * czasu widać poster (ten sam kadr), więc wizualnie nic się nie zmienia —
 * ale kilka MB wideo nie konkuruje o łącze z HTML/CSS/JS i obrazkami, które
 * są potrzebne do pierwszego renderu (na mobile to było główne źródło
 * wysokiego LCP w PageSpeed Insights).
 */
export default function HeroVideo({ src, srcMobile, poster }: { src: string; srcMobile?: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = () => setReady(true);
    if (document.readyState === "complete") {
      start();
      return;
    }
    window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!ready || !video) return;
    // Źródła <source> dodane po montażu wymagają load(); play() na wypadek, gdyby autoplay nie ruszył sam.
    video.load();
    video.play().catch(() => {});
  }, [ready]);

  return (
    <video ref={ref} className="absolute inset-0 w-full h-full object-cover pointer-events-none" autoPlay muted loop playsInline preload="none" poster={poster}>
      {ready && srcMobile && <source src={srcMobile} type="video/mp4" media="(max-width: 767px)" />}
      {ready && <source src={src} type="video/mp4" />}
    </video>
  );
}
