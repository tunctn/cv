import { createServerFn } from "@tanstack/react-start";
import type { UIMessage } from "ai";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { db } from "#/db";
import { cv as cvTable } from "#/db/schema";
import { requireUser } from "#/lib/server/session";
import { m } from "#/paraglide/messages.js";

import { normalizeCv } from "./schema";

/**
 * Turn the public link on or off, and choose whether it shows the chat.
 * Switching off clears the link id, so an old link stops working.
 */
export const setSharing = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      enabled: z.boolean().optional(),
      chat: z.boolean().optional(),
    })
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const where = and(eq(cvTable.id, data.id), eq(cvTable.userId, user.id));
    const [row] = await db
      .select({ shareId: cvTable.shareId, shareChat: cvTable.shareChat })
      .from(cvTable)
      .where(where);
    if (!row) {
      throw new Error(m.err_cv_not_found());
    }
    let { shareId } = row;
    if (data.enabled === true && !shareId) {
      shareId = nanoid(12);
    }
    if (data.enabled === false) {
      shareId = null;
    }
    const shareChat = data.chat ?? row.shareChat;
    await db.update(cvTable).set({ shareId, shareChat }).where(where);
    return { shareId, shareChat };
  });

/** Empty the AI chat of a CV. */
export const clearChat = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    await db
      .update(cvTable)
      .set({ chat: [] })
      .where(and(eq(cvTable.id, data.id), eq(cvTable.userId, user.id)));
    return { ok: true };
  });

const publicMessage = (msg: UIMessage): UIMessage => ({
  ...msg,
  parts: msg.parts.filter((p) => p.type !== "file"),
});

/** A shared CV as anyone with the link sees it. */
export const getSharedCv = createServerFn({ method: "GET" })
  .validator(z.object({ shareId: z.string().min(8).max(32) }))
  .handler(async ({ data }) => {
    const [row] = await db
      .select()
      .from(cvTable)
      .where(eq(cvTable.shareId, data.shareId));
    if (!row) {
      return null;
    }
    const chat = row.shareChat ? (row.chat as UIMessage[]) : [];
    return {
      id: row.id,
      title: row.title,
      template: row.template,
      pages: row.pages,
      data: normalizeCv(row.data),
      chatJson: JSON.stringify(chat.map(publicMessage)),
      updatedAt: row.updatedAt.toISOString(),
    };
  });
