import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { and, count, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";

import { db } from "#/db";
import { cv as cvTable, user as userTable } from "#/db/schema";
import {
  GUEST_AI_LIMIT,
  GUEST_CV_LIMIT,
  GUEST_LIMIT,
  limitKindFor,
  VERIFY_LIMIT,
} from "#/lib/guest";
import { isAdminUser } from "#/lib/server/admin-guard";
import { deviceHash, deviceUsed, spendDevice } from "#/lib/server/guest-device";
import { externalizePhoto } from "#/lib/server/photos";
import { deleteCvAndFiles } from "#/lib/server/purge";
import { getSession, requireUser } from "#/lib/server/session";
import { m } from "#/paraglide/messages.js";
import { getLocale, isLocale } from "#/paraglide/runtime.js";

import { sampleCv } from "./sample";
import { type CV, cvSchema, emptyCv, normalizeCv } from "./schema";
import { TEMPLATE_IDS } from "./templates";

export const getViewer = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }
  const u = session.user as typeof session.user & {
    isAnonymous?: boolean | null;
  };
  let guestAiLeft: number | null = null;
  const limitKind = limitKindFor(u);
  if (limitKind) {
    const [row] = await db
      .select({ used: userTable.aiMessages })
      .from(userTable)
      .where(eq(userTable.id, u.id));
    const device =
      limitKind === "guest"
        ? await deviceUsed(deviceHash(getRequestHeader("cookie")), "aiMessages")
        : 0;
    guestAiLeft = Math.max(
      0,
      GUEST_AI_LIMIT - Math.max(row?.used ?? 0, device)
    );
  }
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image ?? null,
    isAnonymous: Boolean(u.isAnonymous),
    emailVerified: Boolean(u.emailVerified),
    /** Why the free limits apply: guest, unconfirmed email, or none. */
    limitKind,
    /** Shows the Admin entry in the account menu (checked again on /admin). */
    isAdmin: await isAdminUser(u),
    /** AI messages a guest has left; null for signed-up users. */
    guestAiLeft,
  };
});

/** Guests may keep only a few CVs; signing up lifts the limit. */
async function assertCanCreate(user: {
  id: string;
  isAnonymous?: boolean | null;
  emailVerified?: boolean | null;
}) {
  const kind = limitKindFor(user);
  if (!kind) {
    return;
  }
  const code = kind === "guest" ? GUEST_LIMIT : VERIFY_LIMIT;
  const [row] = await db
    .select({ n: count() })
    .from(cvTable)
    .where(eq(cvTable.userId, user.id));
  if ((row?.n ?? 0) >= GUEST_CV_LIMIT) {
    throw new Error(code);
  }
  if (kind !== "guest") {
    return;
  }
  // The same browser as an earlier guest shares that guest's allowance.
  const device = deviceHash(getRequestHeader("cookie"));
  if (!(await spendDevice(device, "cvs", GUEST_CV_LIMIT))) {
    throw new Error(GUEST_LIMIT);
  }
}

export const getAuthOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    const { authConfig } = await import("#/lib/auth");
    return authConfig;
  }
);

export const listCvs = createServerFn({ method: "GET" }).handler(async () => {
  const session = await getSession();
  if (!session) {
    return [];
  }
  const rows = await db
    .select()
    .from(cvTable)
    .where(eq(cvTable.userId, session.user.id))
    .orderBy(desc(cvTable.updatedAt));
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    template: r.template,
    data: normalizeCv(r.data),
    updatedAt: r.updatedAt.toISOString(),
  }));
});

export const getCv = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const [row] = await db
      .select()
      .from(cvTable)
      .where(and(eq(cvTable.id, data.id), eq(cvTable.userId, user.id)));
    if (!row) {
      return null;
    }
    return {
      id: row.id,
      title: row.title,
      template: row.template,
      data: normalizeCv(row.data),
      chatJson: JSON.stringify(row.chat ?? []),
      shareId: row.shareId,
      shareChat: row.shareChat,
      pages: row.pages,
      updatedAt: row.updatedAt.toISOString(),
    };
  });

export const createCv = createServerFn({ method: "POST" })
  .validator(
    z.object({
      template: z.enum(TEMPLATE_IDS).optional(),
      sample: z.boolean().optional(),
      title: z.string().optional(),
      /** The creator's UI locale; headings and title of a new CV use it. */
      locale: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    await assertCanCreate(user);
    const locale =
      data.locale && isLocale(data.locale) ? data.locale : getLocale();
    const id = nanoid(12);
    await db.insert(cvTable).values({
      id,
      userId: user.id,
      title: data.title ?? m.cv_untitled({}, { locale }),
      template: data.template ?? "classic",
      data: data.sample ? sampleCv(locale) : withAccount(emptyCv(locale), user),
    });
    return { id };
  });

export const updateCv = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string(),
      title: z.string().max(120).optional(),
      template: z.enum(TEMPLATE_IDS).optional(),
      data: cvSchema.optional(),
      pages: z.number().int().min(1).max(50).optional(),
    })
  )
  .handler(async ({ data }) => {
    const user = await requireUser();
    const { id, ...patch } = data;
    if (patch.data) {
      patch.data = await externalizePhoto(patch.data);
    }
    await db
      .update(cvTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(cvTable.id, id), eq(cvTable.userId, user.id)));
    return { ok: true };
  });

export const duplicateCv = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    const [row] = await db
      .select()
      .from(cvTable)
      .where(and(eq(cvTable.id, data.id), eq(cvTable.userId, user.id)));
    if (!row) {
      throw new Error(m.err_cv_not_found());
    }
    await assertCanCreate(user);
    const id = nanoid(12);
    await db.insert(cvTable).values({
      id,
      userId: user.id,
      title: m.cv_copy_title({ title: row.title }),
      template: row.template,
      data: row.data,
    });
    return { id };
  });

export const deleteCv = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const user = await requireUser();
    await deleteCvAndFiles(data.id, user.id);
    return { ok: true };
  });

/**
 * A new CV starts with the account's name, email and photo (never for
 * guests, whose "name" is a placeholder). The person can change them.
 */
function withAccount(
  cv: CV,
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    isAnonymous?: boolean | null;
  }
): CV {
  if (user.isAnonymous) {
    return cv;
  }
  const local = user.email?.split("@")[0] ?? "";
  const name = user.name && user.name !== local ? user.name : "";
  return {
    ...cv,
    basics: {
      ...cv.basics,
      name: cv.basics.name || name,
      email: cv.basics.email || (user.email ?? ""),
      photo: cv.basics.photo || (user.image ?? ""),
    },
  };
}
