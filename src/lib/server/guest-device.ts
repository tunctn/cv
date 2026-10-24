import { createHash } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";

import { db } from "#/db";
import { guestDevice } from "#/db/schema";
import { readConsent } from "#/lib/consent";
import { DEVICE_COOKIE } from "#/lib/guest";

const VISITOR_ID = /^[a-f0-9]{16,64}$/i;

/** Salted hash of the browser's visitor id; null without a usable cookie. */
export function deviceHash(cookieHeader: string | null | undefined) {
  if (!readConsent(cookieHeader).functional) {
    return null;
  }
  const match = (cookieHeader ?? "").match(
    new RegExp(`(?:^|; )${DEVICE_COOKIE}=([^;]*)`)
  );
  const id = match ? decodeURIComponent(match[1]) : "";
  if (!VISITOR_ID.test(id)) {
    return null;
  }
  return createHash("sha256")
    .update(`${process.env.BETTER_AUTH_SECRET ?? ""}:${id}`)
    .digest("hex");
}

type Counter = "cvs" | "aiMessages";

/** Use one of the device's free `field` units; false if none are left. */
export async function spendDevice(
  hash: string | null,
  field: Counter,
  limit: number
) {
  if (!hash) {
    return true;
  }
  await db.insert(guestDevice).values({ hash }).onConflictDoNothing();
  const column = guestDevice[field];
  const [row] = await db
    .update(guestDevice)
    .set({ [field]: sql`${column} + 1`, updatedAt: new Date() })
    .where(and(eq(guestDevice.hash, hash), lt(column, limit)))
    .returning({ hash: guestDevice.hash });
  return Boolean(row);
}

/** How many of the device's free `field` units are used. */
export async function deviceUsed(hash: string | null, field: Counter) {
  if (!hash) {
    return 0;
  }
  const [row] = await db
    .select({ n: guestDevice[field] })
    .from(guestDevice)
    .where(eq(guestDevice.hash, hash));
  return row?.n ?? 0;
}
