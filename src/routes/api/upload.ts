import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "#/db";
import { cvFile, cv as cvTable } from "#/db/schema";
import { auth } from "#/lib/auth";
import { fileUrl, MAX_FILE_BYTES } from "#/lib/server/files";
import { fileKey, putObject } from "#/lib/server/storage";

/** Store a file attached in the chat; answers with its URL. */
export const Route = createFileRoute("/api/upload")({
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
        const form = await request.formData();
        const file = form.get("file");
        const cvId = String(form.get("cvId") ?? "");
        if (!(file instanceof File) || file.size > MAX_FILE_BYTES) {
          return new Response("Bad file", { status: 400 });
        }
        const [row] = await db
          .select({ id: cvTable.id })
          .from(cvTable)
          .where(
            and(eq(cvTable.id, cvId), eq(cvTable.userId, session.user.id))
          );
        if (!row) {
          return new Response("Not found", { status: 404 });
        }
        const id = nanoid(16);
        const mediaType = file.type || "application/octet-stream";
        await putObject(fileKey(id), await file.arrayBuffer(), mediaType);
        await db.insert(cvFile).values({
          id,
          cvId,
          userId: session.user.id,
          name: file.name.slice(0, 200) || "file",
          mediaType,
          size: file.size,
        });
        return Response.json({ url: fileUrl(id, file.size) });
      },
    },
  },
});
