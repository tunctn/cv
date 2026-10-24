import { Reveal } from "#/components/marketing/reveal";
import { SectionHeading } from "#/components/marketing/section-heading";
import { m } from "#/paraglide/messages.js";

const STEPS = [
  { key: "pick", title: m.how_step1_title, body: m.how_step1_body },
  { key: "fill", title: m.how_step2_title, body: m.how_step2_body },
  { key: "download", title: m.how_step3_title, body: m.how_step3_body },
];

export function HowItWorks() {
  return (
    <section className="pt-24 sm:pt-36">
      <Reveal>
        <SectionHeading title={m.how_title()} />
      </Reveal>
      <ol className="mt-12 grid gap-10 sm:mt-14 md:grid-cols-3 md:gap-8">
        {STEPS.map((step, i) => (
          <li className="border-border border-t" key={step.key}>
            <Reveal className="pt-6" delay={i * 80}>
              <span className="flex size-8 items-center justify-center rounded-full bg-foreground font-semibold text-[13px] text-background tabular-nums">
                {i + 1}
              </span>
              <h3 className="mt-5 font-semibold text-[19px] tracking-[-0.015em]">
                {step.title()}
              </h3>
              <p className="mt-2 max-w-[360px] text-[15px] text-muted-foreground leading-relaxed">
                {step.body()}
              </p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}
