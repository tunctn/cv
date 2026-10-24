import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { AnalyticsConfig } from "#/lib/analytics-config";
import { authClient } from "#/lib/auth-client";
import { analyticsAllowed, CONSENT_CHANGED } from "#/lib/consent";
import { BEFORE_SEND, identify, installBeforeSend } from "#/lib/track";

/** Pages that are never tracked or recorded. */
const excluded = (path: string) =>
  path.startsWith("/admin") || path.startsWith("/print/");

function addScript(id: string, attrs: Record<string, string>) {
  if (document.getElementById(id)) {
    return;
  }
  const s = document.createElement("script");
  s.id = id;
  s.defer = true;
  for (const [k, v] of Object.entries(attrs)) {
    s.setAttribute(k, v);
  }
  document.head.appendChild(s);
}

/**
 * Umami, loaded after hydration when UMAMI_WEBSITE_ID is set:
 * - the tracker (cookieless, anonymous page views and product events from
 *   src/lib/track.ts) for every visitor, honouring Do Not Track;
 * - with analytics consent only: the replay/heatmap recorder and a
 *   pseudonymous visitor id. CV pages, chats and forms carry `rr-block` so
 *   their content is never recorded; typed input is masked by Umami.
 * Neither ever loads on /admin or the print pages.
 */
export function Analytics({ config }: { config: AnalyticsConfig | null }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [consent, setConsent] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setConsent(analyticsAllowed());
    const onChange = () => setConsent(analyticsAllowed());
    window.addEventListener(CONSENT_CHANGED, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED, onChange);
  }, []);

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
    setLoaded(true);
  }, [skip, config]);

  useEffect(() => {
    if (skip || !(config && loaded && consent)) {
      return;
    }
    addScript("umami-recorder", {
      src: config.recorderUrl,
      "data-website-id": config.websiteId,
    });
  }, [skip, config, loaded, consent]);

  return loaded && consent && !skip ? <Identify /> : null;
}

/** Ties the visit to a hash of the signed-in user's id. */
function Identify() {
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
}
