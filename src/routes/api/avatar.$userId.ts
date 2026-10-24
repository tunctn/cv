import { createFileRoute } from "@tanstack/react-router";
import { avatarKey, getObject } from "#/lib/server/storage";

/** A user's uploaded profile picture. Public; the URL changes on every upload. */
export const Route = createFileRoute("/api/avatar/$userId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const object = await getObject(avatarKey(params.userId));
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
