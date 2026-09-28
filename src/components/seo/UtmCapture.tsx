"use client";

import { useEffect } from "react";
import { captureUtm } from "@/lib/utm";

/** Zapamiętuje parametry UTM z adresu wejścia (patrz src/lib/utm.ts). Nic nie renderuje. */
export default function UtmCapture() {
  useEffect(() => {
    captureUtm();
  }, []);

  return null;
}
