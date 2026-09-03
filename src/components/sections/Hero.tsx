import Link from "next/link";
import type { JSX } from "react";
import { unwrap, type EditableValue } from "@/lib/editable";

type HeroFields = {
  eyebrow?: EditableValue<string> | string;
  heading: EditableValue<string> | string;
  lead?: EditableValue<string> | string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export default function Hero({
  fields,
  headingLevel = 1,
}: {
  fields: HeroFields;
  headingLevel?: number;
}) {
  const eyebrow = unwrap(fields.eyebrow);
  const heading = unwrap(fields.heading);
  const lead = unwrap(fields.lead);
  const { primaryCta, secondaryCta } = fields;
  const Heading = `h${headingLevel}` as keyof JSX.IntrinsicElements;

  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          {eyebrow}
        </p>
      )}
      <Heading className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {heading}
      </Heading>
      {lead && (
        <p className="mt-4 text-lg leading-8 text-zinc-600">
          {lead}
        </p>
      )}
      {(primaryCta || secondaryCta) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {primaryCta && (
            <Link
              href={primaryCta.href}
              className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-[#383838]"
            >
              {primaryCta.label}
            </Link>
          )}
          {secondaryCta && (
            <Link
              href={secondaryCta.href}
              className="rounded-full border border-black/[.08] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/[.04]"
            >
              {secondaryCta.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
