import { and, eq } from "drizzle-orm";

import { db } from "#/db";
import { account } from "#/db/schema";
import { auth } from "#/lib/auth";
import { serverEnv } from "#/lib/server/env";

/** Lower-cased emails from ADMIN_EMAILS (comma separated). */
export async function adminEmails() {
  return ((await serverEnv("ADMIN_EMAILS")) ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

interface SessionUser {
  banned?: boolean | null;
  email: string;
  emailVerified: boolean;
  id: string;
  isAnonymous?: boolean | null;
}

/**
 * Whether a signed-in user may use /admin: their email is in ADMIN_EMAILS
 * and proven, i.e. verified or coming from a Google sign-in.
 */
export async function isAdminUser(user: SessionUser | null | undefined) {
  if (!user || user.isAnonymous || user.banned) {
    return false;
  }
  if (!(await adminEmails()).includes(user.email.toLowerCase())) {
    return false;
  }
  if (user.emailVerified) {
    return true;
  }
  const [google] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, "google")));
  return Boolean(google);
}

/** The admin behind a request, or null. */
export async function adminFromHeaders(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  const user = session?.user as SessionUser | undefined;
  return (await isAdminUser(user)) ? (user as SessionUser) : null;
}
