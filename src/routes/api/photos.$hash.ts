import { createFileRoute } from "@tanstack/react-router";

import { PHOTO_HASH } from "#/lib/server/photos";
import { getObject, photoKey } from "#/lib/server/storage";

/** A CV photo. Public (shared CVs show it); the URL is its content hash. */
export const Route = createFileRoute("/api/photos/$hash")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const object = PHOTO_HASH.test(params.hash)
          ? await getObject(photoKey(params.hash))
          : null;
        if (!object) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(object.body, {
          headers: {
            "content-type": object.contentType,
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
