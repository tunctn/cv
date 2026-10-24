import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { db } from "#/db";
import { cvFile } from "#/db/schema";
import { adminFromHeaders } from "#/lib/server/admin-guard";
import { fileKey, getObject } from "#/lib/server/storage";

/** Any chat file, downloaded by an admin (never rendered inline). */
export const Route = createFileRoute("/api/admin/files/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!(await adminFromHeaders(request.headers))) {
          return new Response("Not found", { status: 404 });
        }
        const [row] = await db
          .select({
            id: cvFile.id,
            name: cvFile.name,
            mediaType: cvFile.mediaType,
          })
          .from(cvFile)
          .where(eq(cvFile.id, params.id));
        const object = row ? await getObject(fileKey(row.id)) : null;
        if (!(row && object)) {
          return new Response("Not found", { status: 404 });
        }
        const inline = new URL(request.url).searchParams.has("inline");
        // Inline only for images; anything else downloads, so an uploaded
        // HTML file can never run on this origin.
        const safeInline =
          inline &&
          row.mediaType.startsWith("image/") &&
          row.mediaType !== "image/svg+xml";
        return new Response(object.body, {
          headers: {
            "content-type": row.mediaType,
            "content-disposition": `${safeInline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(row.name)}`,
            "cache-control": "private, no-store",
            "x-content-type-options": "nosniff",
            "content-security-policy":
              "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
          },
        });
      },
    },
  },
});
