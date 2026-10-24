import { createFileRoute } from "@tanstack/react-router";
import { UI_MESSAGE_STREAM_HEADERS } from "ai";
import { and, eq } from "drizzle-orm";

import { db } from "#/db";
import { cv as cvTable } from "#/db/schema";
import { auth } from "#/lib/auth";
import { replayStream, stopStream } from "#/lib/server/active-streams";

/** Resume a reply that is still streaming (after a page reload). */
export const Route = createFileRoute("/api/chat-stream/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
          return new Response("Unauthorized", { status: 401 });
        }
        const [row] = await db
          .select({ id: cvTable.id })
          .from(cvTable)
          .where(
            and(eq(cvTable.id, params.id), eq(cvTable.userId, session.user.id))
          );
        const stream = row ? replayStream(row.id) : null;
        if (!stream) {
          return new Response(null, { status: 204 });
        }
        return new Response(stream.pipeThrough(new TextEncoderStream()), {
          headers: UI_MESSAGE_STREAM_HEADERS,
        });
      },
      /** The user pressed Stop: end the reply on the server too. */
      DELETE: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers });
        if (!session) {
          return new Response(null, { status: 401 });
        }
        const [row] = await db
          .select({ id: cvTable.id })
          .from(cvTable)
          .where(
            and(eq(cvTable.id, params.id), eq(cvTable.userId, session.user.id))
          );
        if (row) {
          stopStream(row.id);
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
