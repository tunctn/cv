import { DEVICE_COOKIE } from "#/lib/guest";

/**
 * Cookie consent. Essential storage (sign-in session, this choice, language,
 * theme, editor layout) needs no consent: it is either required to run the
 * site or a setting the visitor chose themselves. "Functional" covers the
 * rest: the guest device id (FingerprintJS) and the "Last used" sign-in hint.
 * "Analytics" covers session replays and heatmaps (Umami recorder) and tying
 * visits to a pseudonymous id. Umami's page and event counts are cookieless
 * and anonymous, so they run without consent (see the privacy policy).
 * We use no analytics or advertising cookies.
 */
export const CONSENT_COOKIE = "cv_consent";
export const LAST_LOGIN_COOKIE = "better-auth.last_used_login_method";
const YEAR = 60 * 60 * 24 * 365;

/** Fired to reopen the cookie settings (footer link). */
export const OPEN_COOKIE_SETTINGS = "cv:cookie-settings";
/** Fired after the visitor saves a choice. */
export const CONSENT_CHANGED = "cv:consent-changed";

export interface Consent {
  /** Session replays, heatmaps and a pseudonymous visitor id. */
  analytics: boolean;
  /** The visitor has made a choice (no banner). */
  chosen: boolean;
  functional: boolean;
}

const cookieValue = (cookies: string, name: string) => {
  const match = cookies.match(
    new RegExp(`(?:^|;\\s*)${name}=(?<value>[^;]*)`, "u")
  );
  return match ? decodeURIComponent(match.groups?.value ?? "") : null;
};

export const readConsent = (cookies: string | null | undefined): Consent => {
  const v = cookieValue(cookies ?? "", CONSENT_COOKIE);
  const parts = (v ?? "").split(",");
  return {
    chosen: v !== null,
    functional: parts.includes("functional"),
    analytics: parts.includes("analytics"),
  };
};

export const functionalAllowed = () =>
  typeof document !== "undefined" && readConsent(document.cookie).functional;

const expire = (name: string) => {
  // oxlint-disable-next-line unicorn/no-document-cookie -- removing a plain cookie
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
};

/** Subscribe to saved consent choices (for useSyncExternalStore). */
export const subscribeConsent = (onChange: () => void) => {
  window.addEventListener(CONSENT_CHANGED, onChange);
  return () => window.removeEventListener(CONSENT_CHANGED, onChange);
};

export const analyticsAllowed = () =>
  typeof document !== "undefined" && readConsent(document.cookie).analytics;

export const saveConsent = (functional: boolean, analytics = functional) => {
  const value =
    [functional && "functional", analytics && "analytics"]
      .filter(Boolean)
      .join(",") || "essential";
  // oxlint-disable-next-line unicorn/no-document-cookie -- the consent choice is a plain cookie the server also reads
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${YEAR}; samesite=lax`;
  window.dispatchEvent(new Event(CONSENT_CHANGED));
  if (!functional) {
    expire(DEVICE_COOKIE);
    expire(LAST_LOGIN_COOKIE);
  }
};
