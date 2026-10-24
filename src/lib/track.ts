/**
 * Product analytics through Umami (self-hosted, cookieless). Every event the
 * app sends is listed here, so the funnel is readable in one place and the
 * names stay stable for dashboards. Calls are no-ops when Umami isn't loaded
 * (no UMAMI_WEBSITE_ID, ad blockers, server render) and on /admin and /print.
 * Never put personal data (names, emails, CV text) into event data.
 */

interface Guest {
  guest: boolean;
}

export interface TrackEvents {
  account_deleted: Record<string, never>;
  ai_error: { reason: string } & Guest;
  ai_message_sent: {
    how: "typed" | "quick" | "clip" | "import" | "retry";
  } & Guest &
    Partial<{ action: string; files: number }>;
  /** Landing and marketing call-to-action clicks. */
  cta_click: { where: string };
  cv_created: { from: "template" | "sample" | "import" | "blank" } & Guest &
    Partial<{ template: string }>;
  export: { format: "pdf" | "png" } & Partial<{ ok: boolean }>;
  /** The first edit of a CV in this browser tab. */
  first_edit: { how: "inline" | "ai" };
  guest_limit_hit: { limit: "cv" | "ai"; kind: "guest" | "verify" };
  guest_started: Record<string, never>;
  history_jump: Record<string, never>;
  import_failed: { type: string; reason: string };
  import_started: { type: string };
  import_succeeded: { type: string };
  login: { method: "email" };
  login_started: { method: "google" };
  redo: { how: "button" | "key" };
  section_added: { section: string };
  settings_opened: Record<string, never>;
  share_cta_click: { where: string };
  share_link_created: { chat: boolean };
  share_link_removed: Record<string, never>;
  share_pdf_downloaded: Record<string, never>;
  signup: { method: "email" };
  signup_gate_click: {
    reason: "cv" | "ai";
    method: "google" | "email" | "login";
  };
  signup_gate_shown: { reason: "cv" | "ai"; kind: "guest" | "verify" };
  signup_started: { method: "email" | "google" };
  template_chosen: { template: string; where: string };
  template_switched: { from: string; to: string };
  undo: { how: "button" | "key" };
}

export type TrackName = keyof TrackEvents;

interface Umami {
  identify: (id: string, data?: Record<string, unknown>) => void;
  track: (name: string, data?: Record<string, unknown>) => void;
}

function umami(): Umami | null {
  if (typeof window === "undefined") {
    return null;
  }
  const path = window.location.pathname;
  if (path.startsWith("/admin") || path.startsWith("/print/")) {
    return null;
  }
  return (window as { umami?: Umami }).umami ?? null;
}

/** Sends a product event; never throws. */
export function track<N extends TrackName>(
  name: N,
  ...data: TrackEvents[N] extends Record<string, never> ? [] : [TrackEvents[N]]
) {
  try {
    umami()?.track(name, data[0] as Record<string, unknown> | undefined);
  } catch {
    // Analytics must never break the app.
  }
}

const once = new Set<string>();

/** Like track, but at most once per key in this page's lifetime. */
export function trackOnce<N extends TrackName>(
  key: string,
  name: N,
  ...data: TrackEvents[N] extends Record<string, never> ? [] : [TrackEvents[N]]
) {
  if (once.has(key)) {
    return;
  }
  once.add(key);
  track(name, ...data);
}

/**
 * Ties this visit to a pseudonymous id (a hash of the user id, never the id
 * or email itself) so retention and churn can be followed across visits.
 * Only with analytics consent; see Analytics in src/components/analytics.tsx.
 */
export async function identify(userId: string, guest: boolean) {
  const u = umami();
  if (!(u && window.crypto?.subtle)) {
    return;
  }
  try {
    const bytes = await window.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(`smilecv.com:${userId}`)
    );
    const id = [...new Uint8Array(bytes)]
      .slice(0, 12)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    u.identify(id, { guest });
  } catch {
    // ignore
  }
}

/** For Umami's data-before-send: drop anything sent from /admin or /print. */
export const BEFORE_SEND = "__cvUmamiBeforeSend";

export function installBeforeSend() {
  (window as unknown as Record<string, unknown>)[BEFORE_SEND] = (
    _type: string,
    payload: { url?: string }
  ) => {
    const url = payload.url ?? window.location.pathname;
    let path = url;
    try {
      path = new URL(url, window.location.origin).pathname;
    } catch {
      // keep as is
    }
    return path.startsWith("/admin") || path.startsWith("/print/")
      ? false
      : payload;
  };
}
