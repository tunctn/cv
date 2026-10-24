import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { openCookieSettings } from "#/components/cookie-banner";
import { LanguageSelect } from "#/components/language-select";
import { CONTACT_EMAIL } from "#/components/marketing/faq-copy";
import { Logo } from "#/components/primitives";
import { ThemeSwitcher } from "#/components/theme-switcher";
import { BRAND } from "#/lib/brand";
import { REPO_URL } from "#/lib/github";
import { isGuestLimit } from "#/lib/guest";
import { startCv } from "#/lib/start-cv";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

const linkClass =
  "w-fit cursor-pointer text-[16px] text-muted-foreground transition-colors hover:text-foreground sm:text-[17px]";

export const SiteFooter = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const openEditor = useCallback(async () => {
    setBusy(true);
    try {
      const { id } = await startCv({});
      await navigate({ to: "/cv/$id", params: { id } });
    } catch (error) {
      if (!isGuestLimit(error)) {
        toast.error((error as Error).message);
      }
      setBusy(false);
    }
  }, [navigate]);

  return (
    <footer className={cn("border-border border-t", className)}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6">
        <div className="flex flex-col-reverse gap-10 py-12 sm:flex-row sm:items-start sm:justify-between sm:py-16">
          <nav className="grid grid-cols-2 gap-x-16 gap-y-3.5 sm:gap-x-24">
            <ul className="flex flex-col gap-3.5">
              <li>
                <Link className={linkClass} hash="templates" to="/">
                  {m.footer_templates()}
                </Link>
              </li>
              <li>
                <button
                  className={cn(linkClass, "disabled:cursor-wait")}
                  disabled={busy}
                  onClick={openEditor}
                  type="button"
                >
                  {m.footer_editor()}
                </button>
              </li>
              <li>
                <Link className={linkClass} hash="faq" to="/">
                  {m.footer_faq()}
                </Link>
              </li>
              <li>
                <a
                  className={linkClass}
                  href={REPO_URL}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {m.github_text()}
                </a>
              </li>
            </ul>
            <ul className="flex flex-col gap-3.5">
              <li>
                <a
                  className={linkClass}
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(m.footer_support_subject({ brand: BRAND.name }))}`}
                >
                  {m.footer_support()}
                </a>
              </li>
              <li>
                <Link className={linkClass} to="/privacy">
                  {m.footer_privacy()}
                </Link>
              </li>
              <li>
                <Link className={linkClass} to="/terms">
                  {m.footer_terms()}
                </Link>
              </li>
              <li>
                <button
                  className={`${linkClass} cursor-pointer text-start`}
                  onClick={openCookieSettings}
                  type="button"
                >
                  {m.cookies_settings_link()}
                </button>
              </li>
              <li>
                <a className={linkClass} href={`mailto:${CONTACT_EMAIL}`}>
                  {m.footer_contact()}
                </a>
              </li>
            </ul>
          </nav>
          <Link className="flex w-fit items-center" to="/">
            <Logo />
          </Link>
        </div>
        <div className="border-border flex flex-col gap-5 border-t py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-[14px]">
            © 2026 {BRAND.name}
          </p>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <LanguageSelect />
          </div>
        </div>
      </div>
    </footer>
  );
};
