import { createFileRoute } from "@tanstack/react-router";

import { auth } from "#/lib/auth";
import { MAX_PHOTO_BYTES, storePhoto } from "#/lib/server/photos";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Store a CV photo (already downscaled in the browser); answers with its URL. */
export const Route = createFileRoute("/api/photo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
          return new Response("Unauthorized", { status: 401 });
        }
        if ((session.user as { banned?: boolean | null }).banned) {
          return new Response("Forbidden", { status: 403 });
        }
        const type = request.headers.get("content-type") ?? "";
        const bytes = new Uint8Array(await request.arrayBuffer());
        if (!IMAGE_TYPES.has(type) || bytes.byteLength > MAX_PHOTO_BYTES) {
          return new Response("Bad photo", { status: 400 });
        }
        return Response.json({ url: await storePhoto(bytes, type) });
      },
    },
  },
});
