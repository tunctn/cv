import {
  ArrowRight01Icon,
  ArrowRight02Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import {
  createFileRoute,
  useNavigate,
  getRouteApi,
} from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ImportButton, useCvImport } from "#/components/dashboard/import-cv";
import { Icon } from "#/components/icon";
import { Faq } from "#/components/marketing/faq";
import { Features } from "#/components/marketing/features";
import { FinalCta } from "#/components/marketing/final-cta";
import { HeroApp } from "#/components/marketing/hero-app";
import { HowItWorks } from "#/components/marketing/how-it-works";
import { Reveal } from "#/components/marketing/reveal";
import { SectionHeading } from "#/components/marketing/section-heading";
import { TemplateCarousel } from "#/components/marketing/template-carousel";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import { Button } from "#/components/ui/button";
import { getViewer } from "#/lib/cv/functions";
import { sampleCv } from "#/lib/cv/sample";
import { TEMPLATES } from "#/lib/cv/templates";
import type { TemplateId } from "#/lib/cv/templates";
import { isGuestLimit } from "#/lib/guest";
import { startCv } from "#/lib/start-cv";
import { track } from "#/lib/track";
import { m } from "#/paraglide/messages.js";

const routeApi = getRouteApi("/");

const Home = () => {
  const { viewer, sample } = routeApi.useLoaderData();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const importer = useCvImport();
  const handleImport = importer.run;

  const start = useCallback(
    async (key: string, opts: { template?: TemplateId; sample?: boolean }) => {
      setBusy(key);
      if (opts.template) {
        track("template_chosen", { template: opts.template, where: "home" });
      } else {
        track("cta_click", { where: key });
      }
      try {
        const { id } = await startCv(opts);
        await navigate({ to: "/cv/$id", params: { id } });
      } catch (error) {
        if (!isGuestLimit(error)) {
          toast.error((error as Error).message);
        }
        setBusy(null);
      }
    },
    [navigate]
  );
  const startBlank = useCallback(() => start("blank", {}), [start]);
  const startSample = useCallback(
    () => start("sample", { sample: true }),
    [start]
  );

  return (
    <div className="min-h-dvh">
      <SiteHeader viewer={viewer} />

      <main>
        <section className="relative">
          <div
            aria-hidden
            className="home-dots pointer-events-none absolute inset-x-0 top-0 h-[760px]"
          />
          <div className="relative mx-auto max-w-[760px] px-4 pt-20 text-center sm:px-6 sm:pt-32">
            <h1 className="home-rise text-[40px] leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-[60px]">
              {m.home_title()}
            </h1>
            <p className="home-rise text-muted-foreground mx-auto mt-5 max-w-[540px] text-[17px] leading-relaxed text-pretty [--rise-delay:60ms] sm:text-[18px]">
              {m.home_lede()}
            </p>
            <div className="home-rise mt-8 flex flex-wrap items-center justify-center gap-2 [--rise-delay:120ms]">
              <Button disabled={!!busy} onClick={startBlank} size="lg">
                {busy === "blank" ? m.common_creating() : m.home_create()}
                <Icon
                  className="rtl:-scale-x-100"
                  data-icon="inline-end"
                  icon={ArrowRight02Icon}
                />
              </Button>
              <ImportButton
                busy={importer.busy}
                disabled={!!busy}
                label={m.import_cta_home()}
                onFile={handleImport}
                size="lg"
                variant="secondary"
              />
              <Button
                disabled={!!busy}
                onClick={startSample}
                size="lg"
                variant="ghost"
              >
                {busy === "sample" ? m.common_creating() : m.home_example()}
                <Icon
                  className="rtl:-scale-x-100"
                  data-icon="inline-end"
                  icon={ArrowRight01Icon}
                />
              </Button>
            </div>
          </div>
          {/* The fade spans the full width so only the bottom edge softens; the window's shadow is never cut at the sides. */}
          <div className="relative mt-14 [mask-image:linear-gradient(to_bottom,#000_50%,transparent_94%)] px-5 pt-1 sm:mt-24 sm:px-10">
            <HeroApp sample={sample} />
          </div>
        </section>

        <div className="mx-auto max-w-[1280px] px-4 pt-10 pb-6 sm:px-6 sm:pt-16">
          <Reveal>
            <SectionHeading title={m.home_templates_title()} />
          </Reveal>
        </div>
        <TemplateCarousel
          busy={busy}
          onStart={start}
          sample={sample}
          templates={TEMPLATES}
        />

        <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
          <HowItWorks />
          <Features />
          <Reveal>
            <Faq />
          </Reveal>
          <Reveal>
            <FinalCta busy={busy} onBlank={startBlank} onSample={startSample} />
          </Reveal>
        </div>
      </main>
      <Reveal>
        <SiteFooter />
      </Reveal>
    </div>
  );
};

export const Route = createFileRoute("/")({
  loader: async () => {
    const viewer = await getViewer();
    return { viewer, sample: sampleCv() };
  },
  component: Home,
});
