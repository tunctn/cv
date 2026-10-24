import { Link } from "@tanstack/react-router";

import { Logo } from "#/components/primitives";
import { SiteFooter } from "#/components/site-footer";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

export const LegalPage = ({
  title,
  updated,
  children,
}: {
  title: string;
  /** ISO date, formatted for the reader's locale. */
  updated: string;
  children: React.ReactNode;
}) => {
  const locale = getLocale();
  const date = new Date(`${updated}T12:00:00Z`).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 max-w-[720px] items-center px-4 sm:px-6">
        <Link className="flex items-center" to="/">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[720px] flex-1 px-4 pt-10 pb-24 sm:px-6">
        <h1 className="text-[32px] font-semibold tracking-[-0.03em]">
          {title}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {m.legal_updated({ date })}
        </p>
        {locale === "en" ? null : (
          <p className="text-muted-foreground mt-1 text-sm">
            {m.legal_english_note()}
          </p>
        )}
        <div
          className="text-foreground/85 [&_h2]:text-foreground mt-8 space-y-4 text-[15px] leading-relaxed [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
          dir="ltr"
          lang="en"
        >
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};
