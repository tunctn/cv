import { useRouterState } from "@tanstack/react-router";
import { useEffect, useSyncExternalStore } from "react";

import type { AnalyticsConfig } from "#/lib/analytics-config";
import { authClient } from "#/lib/auth-client";
import { analyticsAllowed, subscribeConsent } from "#/lib/consent";
import { BEFORE_SEND, identify, installBeforeSend } from "#/lib/track";

/** Pages that are never tracked or recorded. */
const excluded = (path: string) =>
  path.startsWith("/admin") || path.startsWith("/print/");

const addScript = (id: string, attrs: Record<string, string>) => {
  if (document.querySelector(`#${id}`)) {
    return;
  }
  const s = document.createElement("script");
  s.id = id;
  s.defer = true;
  for (const [k, v] of Object.entries(attrs)) {
    s.setAttribute(k, v);
  }
  document.head.append(s);
};

const Identify = () => {
  const { data } = authClient.useSession();
  const id = data?.user.id;
  const guest = Boolean(
    (data?.user as { isAnonymous?: boolean | null } | undefined)?.isAnonymous
  );
  useEffect(() => {
    if (!id) {
      return;
    }
    // The tracker loads deferred; give it a moment to define window.umami.
    let tries = 0;
    const t = setInterval(() => {
      tries += 1;
      if ((window as { umami?: unknown }).umami || tries > 40) {
        clearInterval(t);
        identify(id, guest);
      }
    }, 250);
    return () => clearInterval(t);
  }, [id, guest]);
  return null;
};

export const Analytics = ({ config }: { config: AnalyticsConfig | null }) => {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const consent = useSyncExternalStore(
    subscribeConsent,
    analyticsAllowed,
    () => false
  );

  const skip = !config || excluded(path);

  useEffect(() => {
    if (skip || !config) {
      return;
    }
    installBeforeSend();
    const attrs: Record<string, string> = {
      src: config.scriptUrl,
      "data-website-id": config.websiteId,
      "data-before-send": BEFORE_SEND,
      "data-do-not-track": "true",
    };
    if (config.domains) {
      attrs["data-domains"] = config.domains;
    }
    if (config.tag) {
      attrs["data-tag"] = config.tag;
    }
    addScript("umami-tracker", attrs);
  }, [skip, config]);

  // Runs after the tracker effect above, so the tracker is already added.
  useEffect(() => {
    if (skip || !(config && consent)) {
      return;
    }
    addScript("umami-recorder", {
      src: config.recorderUrl,
      "data-website-id": config.websiteId,
    });
  }, [skip, config, consent]);

  return consent && !skip ? <Identify /> : null;
};
