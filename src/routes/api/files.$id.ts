import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";

import { db } from "#/db";
import { cvFile } from "#/db/schema";
import { auth } from "#/lib/auth";
import { fileKey, getObject } from "#/lib/server/storage";

/** A chat file, for its owner only. */
export const Route = createFileRoute("/api/files/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
          return new Response("Unauthorized", { status: 401 });
        }
        const [row] = await db
          .select({
            id: cvFile.id,
            name: cvFile.name,
            mediaType: cvFile.mediaType,
          })
          .from(cvFile)
          .where(
            and(eq(cvFile.id, params.id), eq(cvFile.userId, session.user.id))
          );
        const object = row ? await getObject(fileKey(row.id)) : null;
        if (!(row && object)) {
          return new Response("Not found", { status: 404 });
        }
        return new Response(object.body, {
          headers: {
            "content-type": row.mediaType,
            "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
            "cache-control": "private, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
