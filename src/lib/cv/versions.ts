import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import { cv as cvTable, cvVersion } from "#/db/schema";
import { externalizePhoto } from "#/lib/server/photos";
import { requireUser } from "#/lib/server/session";
import { m } from "#/paraglide/messages.js";

import { type CV, cvSchema, normalizeCv } from "./schema";
import { TEMPLATE_IDS } from "./templates";

/** Versions kept per CV; older ones are dropped. */
const KEEP = 500;

export interface StoredVersion {
  at: number;
  cv: CV;
  id: string;
  label: string;
  source: "you" | "ai" | "restore";
  template: string;
}

async function ownCv(cvId: string) {
  const user = await requireUser();
  const [row] = await db
    .select({ id: cvTable.id })
    .from(cvTable)
    .where(and(eq(cvTable.id, cvId), eq(cvTable.userId, user.id)));
  if (!row) {
    throw new Error(m.err_cv_not_found());
  }
}

/** Stored versions, with any pre-R2 photo reference pointed at R2. */
function withPhotos(
  rows: (typeof cvVersion.$inferSelect)[]
): Promise<StoredVersion[]> {
  return Promise.all(
    rows.map(async (r) => ({
      id: r.id,
      at: r.createdAt.getTime(),
      label: r.label,
      source: r.source as StoredVersion["source"],
      template: r.template,
      cv: await externalizePhoto(normalizeCv(r.data)),
    }))
  );
}

/** Versions of a CV, oldest first; `before` pages further back. */
export const listVersions = createServerFn({ method: "GET" })
  .validator(
    z.object({
      cvId: z.string(),
      before: z.number().optional(),
      limit: z.number().int().min(1).max(100).default(40),
    })
  )
  .handler(async ({ data }) => {
    await ownCv(data.cvId);
    const rows = await db
      .select()
      .from(cvVersion)
      .where(
        and(
          eq(cvVersion.cvId, data.cvId),
          data.before
            ? lt(cvVersion.createdAt, new Date(data.before))
            : undefined
        )
      )
      .orderBy(desc(cvVersion.createdAt))
      .limit(data.limit + 1);
    const more = rows.length > data.limit;
    const page = await withPhotos(rows.slice(0, data.limit).reverse());
    return { versions: page, more };
  });

/**
 * Store a version. The newest version keeps absorbing typing, so the same id
 * is saved again with newer content (upsert).
 */
export const saveVersion = createServerFn({ method: "POST" })
  .validator(
    z.object({
      cvId: z.string(),
      id: z.string().min(1).max(64),
      at: z.number(),
      label: z.string().max(200),
      source: z.enum(["you", "ai", "restore"]),
      template: z.enum(TEMPLATE_IDS),
      data: cvSchema,
    })
  )
  .handler(async ({ data }) => {
    await ownCv(data.cvId);
    const stored = await externalizePhoto(data.data);
    const now = new Date();
    await db
      .insert(cvVersion)
      .values({
        id: data.id,
        cvId: data.cvId,
        label: data.label,
        source: data.source,
        template: data.template,
        data: stored,
        createdAt: new Date(data.at),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: cvVersion.id,
        set: { data: stored, template: data.template, updatedAt: now },
        setWhere: eq(cvVersion.cvId, data.cvId),
      });
    // Keep the table bounded (checked now and then, not on every keystroke).
    if (Math.random() > 0.1) {
      return { ok: true };
    }
    await db.execute(sql`
      delete from ${cvVersion}
      where ${cvVersion.cvId} = ${data.cvId}
        and ${cvVersion.id} not in (
          select id from ${cvVersion}
          where ${cvVersion.cvId} = ${data.cvId}
          order by ${cvVersion.createdAt} desc
          limit ${KEEP}
        )
    `);
    return { ok: true };
  });
