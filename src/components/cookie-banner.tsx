import { Link, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Switch } from "#/components/ui/switch";
import { OPEN_COOKIE_SETTINGS, readConsent, saveConsent } from "#/lib/consent";
import { m } from "#/paraglide/messages.js";

/** Opens the cookie settings dialog (e.g. from the footer). */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS));
}

/**
 * A small card in the bottom corner until the visitor chooses; never blocks
 * the page. The settings dialog can be reopened from the footer.
 */
export function CookieBanner() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [show, setShow] = useState(false);
  const [settings, setSettings] = useState(false);
  const [functional, setFunctional] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    const c = readConsent(document.cookie);
    setShow(!c.chosen);
    setFunctional(c.functional);
    setAnalytics(c.analytics);
    const open = () => {
      const now = readConsent(document.cookie);
      setFunctional(now.functional);
      setAnalytics(now.analytics);
      setSettings(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS, open);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, open);
  }, []);

  const choose = useCallback((allow: boolean, allowAnalytics = allow) => {
    saveConsent(allow, allowAnalytics);
    setFunctional(allow);
    setAnalytics(allowAnalytics);
    setShow(false);
    setSettings(false);
  }, []);
  const acceptAll = useCallback(() => choose(true), [choose]);
  const essentialOnly = useCallback(() => choose(false), [choose]);
  const saveSettings = useCallback(
    () => choose(functional, analytics),
    [choose, functional, analytics]
  );
  const openSettings = useCallback(() => setSettings(true), []);

  // Printed CVs (PDF/PNG export) never show it.
  if (path.startsWith("/print/")) {
    return null;
  }

  return (
    <>
      {show && !settings ? (
        <section
          aria-label={m.cookies_title()}
          className="fade-in-0 slide-in-from-bottom-2 fixed right-4 bottom-4 left-4 z-40 animate-in rounded-[20px] border bg-popover p-4 text-popover-foreground shadow-[0_8px_30px_rgba(0,0,0,0.12)] duration-300 motion-reduce:animate-none sm:right-auto sm:left-5 sm:w-[380px]"
        >
          <p className="font-semibold text-[14px]">{m.cookies_title()}</p>
          <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
            {m.cookies_body()}{" "}
            <Link className="underline underline-offset-2" to="/privacy">
              {m.cookies_learn_more()}
            </Link>
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button onClick={acceptAll} size="sm">
              {m.cookies_accept_all()}
            </Button>
            <Button onClick={essentialOnly} size="sm" variant="outline">
              {m.cookies_essential_only()}
            </Button>
            <Button
              className="ms-auto"
              onClick={openSettings}
              size="sm"
              variant="ghost"
            >
              {m.cookies_settings()}
            </Button>
          </div>
        </section>
      ) : null}
      <Dialog onOpenChange={setSettings} open={settings}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{m.cookies_settings_title()}</DialogTitle>
            <DialogDescription>{m.cookies_settings_body()}</DialogDescription>
          </DialogHeader>
          <div className="divide-y rounded-[16px] border">
            <Category
              checked
              description={m.cookies_essential_desc()}
              disabled
              title={m.cookies_essential()}
            />
            <Category
              checked={functional}
              description={m.cookies_functional_desc()}
              onChange={setFunctional}
              title={m.cookies_functional()}
            />
            <Category
              checked={analytics}
              description={m.cookies_analytics_desc()}
              onChange={setAnalytics}
              title={m.cookies_analytics()}
            />
          </div>
          <DialogFooter>
            <Button onClick={essentialOnly} variant="outline">
              {m.cookies_essential_only()}
            </Button>
            <Button onClick={saveSettings}>{m.cookies_save()}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Category({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4">
      <span className="min-w-0">
        <span className="block font-medium text-[14px]">{title}</span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground leading-relaxed">
          {description}
        </span>
      </span>
      <Switch
        aria-label={title}
        checked={checked}
        className="mt-0.5 shrink-0"
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}
