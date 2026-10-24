import handler from "@tanstack/react-start/server-entry";
import { paraglideMiddleware } from "#/paraglide/server.js";

/**
 * Pages and data are per-visitor and change with every deploy, so nothing
 * the app renders may be cached by browsers or CDNs. Routes that set their
 * own Cache-Control (e.g. avatars, chat files) keep it; static assets are
 * served before this handler with their own long-lived headers.
 */
function noStore(res: Response): Response {
  if (res.headers.has("cache-control")) {
    return res;
  }
  try {
    res.headers.set("cache-control", "private, no-store");
    return res;
  } catch {
    // Immutable headers: copy the response.
    const copy = new Response(res.body, res);
    copy.headers.set("cache-control", "private, no-store");
    return copy;
  }
}

/**
 * Server entry: runs every request inside Paraglide's middleware so
 * getLocale() on the server resolves from the cookie or Accept-Language.
 * Locales are not in the URL, so the original request is passed through.
 */
export default {
  async fetch(req: Request): Promise<Response> {
    return noStore(await paraglideMiddleware(req, () => handler.fetch(req)));
  },
};
