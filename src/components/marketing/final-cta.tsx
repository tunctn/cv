import { ArrowRight02Icon } from "@hugeicons-pro/core-stroke-rounded";

import { Icon } from "#/components/icon";
import { Button } from "#/components/ui/button";
import { m } from "#/paraglide/messages.js";

export const FinalCta = ({
  busy,
  onBlank,
  onSample,
}: {
  busy: string | null;
  onBlank: () => void;
  onSample: () => void;
}) => (
  <section className="pt-24 pb-16 sm:pt-36 sm:pb-24">
    <div className="relative isolate px-6 py-16 text-center sm:py-24">
      {/*
          The mascot peeks over the card's top edge. Its body ends exactly at
          the edge (behind the card), and a copy clipped to the two hands sits
          in front so they grip the edge. Static on purpose.
        */}
      <div className="pointer-events-none absolute end-[12%] bottom-full -z-20 w-[92px] translate-y-[4.6%] select-none sm:w-[120px]">
        <img
          alt=""
          className="block w-full"
          decoding="async"
          height={277}
          loading="lazy"
          src="/mascot/peek.webp"
          width={320}
        />
      </div>
      <div
        aria-hidden
        className="bg-surface absolute inset-0 -z-10 rounded-[28px]"
      />
      <div className="pointer-events-none absolute end-[12%] bottom-full w-[92px] translate-y-[4.6%] select-none [clip-path:polygon(0_83%,23%_83%,23%_100%,77%_100%,77%_83%,100%_83%,100%_100%,0_100%)] sm:w-[120px]">
        <img
          alt=""
          className="mascot-hands block w-full"
          decoding="async"
          height={277}
          loading="lazy"
          src="/mascot/peek.webp"
          width={320}
        />
      </div>
      <h2 className="text-[32px] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-[48px]">
        {m.cta_title()}
      </h2>
      <p className="text-muted-foreground mx-auto mt-4 max-w-[420px] text-[17px] leading-relaxed text-pretty">
        {m.cta_body()}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <Button disabled={!!busy} onClick={onBlank} size="lg">
          {busy === "blank" ? m.common_creating() : m.home_create()}
          <Icon
            className="rtl:-scale-x-100"
            data-icon="inline-end"
            icon={ArrowRight02Icon}
          />
        </Button>
        <Button
          className="bg-background hover:bg-background/70"
          disabled={!!busy}
          onClick={onSample}
          size="lg"
          variant="secondary"
        >
          {busy === "sample" ? m.common_creating() : m.home_example()}
        </Button>
      </div>
    </div>
  </section>
);
