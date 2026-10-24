import { Link, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

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
import {
  analyticsAllowed,
  functionalAllowed,
  OPEN_COOKIE_SETTINGS,
  readConsent,
  saveConsent,
  subscribeConsent,
} from "#/lib/consent";
import { m } from "#/paraglide/messages.js";

export const openCookieSettings = () => {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS));
};

const Category = ({
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
}) => (
  <div className="flex items-start justify-between gap-4 p-4">
    <span className="min-w-0">
      <span className="block text-[14px] font-medium">{title}</span>
      <span className="text-muted-foreground mt-0.5 block text-[13px] leading-relaxed">
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

export const CookieBanner = () => {
  const path = useRouterState({ select: (s) => s.location.pathname });
  // null on the server and while hydrating: the banner stays hidden until the
  // consent cookie can be read.
  const cookies = useSyncExternalStore(
    subscribeConsent,
    () => document.cookie,
    () => null
  );
  const [dismissed, setDismissed] = useState(false);
  const show = cookies !== null && !dismissed && !readConsent(cookies).chosen;
  const [settings, setSettings] = useState(false);
  // Only shown inside the settings dialog, which never renders on the server.
  const [functional, setFunctional] = useState(functionalAllowed);
  const [analytics, setAnalytics] = useState(analyticsAllowed);

  useEffect(() => {
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
    setDismissed(true);
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
          className="fade-in-0 slide-in-from-bottom-2 animate-in bg-popover text-popover-foreground fixed right-4 bottom-4 left-4 z-40 rounded-[20px] border p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] duration-300 motion-reduce:animate-none sm:right-auto sm:left-5 sm:w-[380px]"
        >
          <p className="text-[14px] font-semibold">{m.cookies_title()}</p>
          <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
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
};
