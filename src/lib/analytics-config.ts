import { createServerFn } from "@tanstack/react-start";

import { serverEnv as env } from "#/lib/server/env";

const DEFAULT_SCRIPT = "https://analytics.wust.co/script.js";
const FILE_NAME = /[^/]*$/;

/**
 * Umami settings for the page: UMAMI_WEBSITE_ID (off when unset) and
 * UMAMI_SCRIPT_URL; the replay recorder sits next to the tracker script.
 */
export const getAnalyticsConfig = createServerFn({ method: "GET" }).handler(
  async () => {
    const websiteId = await env("UMAMI_WEBSITE_ID");
    if (!websiteId) {
      return null;
    }
    const scriptUrl = (await env("UMAMI_SCRIPT_URL")) || DEFAULT_SCRIPT;
    let domains: string | null = null;
    try {
      domains = new URL(process.env.BETTER_AUTH_URL ?? "").hostname || null;
    } catch {
      domains = null;
    }
    return {
      websiteId,
      scriptUrl,
      recorderUrl: scriptUrl.replace(FILE_NAME, "recorder.js"),
      domains,
      /** Dev traffic is tagged so it can be filtered out in Umami. */
      tag: import.meta.env.DEV ? "dev" : null,
    };
  }
);

export type AnalyticsConfig = NonNullable<
  Awaited<ReturnType<typeof getAnalyticsConfig>>
>;
