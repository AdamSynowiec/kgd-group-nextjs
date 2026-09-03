import type { ReactNode } from "react";

export default function Section({ id, children }: { id: string; children: ReactNode }) {
  return (
    <section id={id} className="border-b border-black/[.06] py-16">
      <div className="mx-auto max-w-5xl px-6">{children}</div>
    </section>
  );
}
