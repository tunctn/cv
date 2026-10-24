import { and, eq } from "drizzle-orm";

import { db } from "#/db";
import { account } from "#/db/schema";
import { auth } from "#/lib/auth";
import { serverEnv } from "#/lib/server/env";

export const adminEmails = async () =>
  ((await serverEnv("ADMIN_EMAILS")) ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

interface SessionUser {
  banned?: boolean | null;
  email: string;
  emailVerified: boolean;
  id: string;
  isAnonymous?: boolean | null;
}

export const isAdminUser = async (user: SessionUser | null | undefined) => {
  if (!user || user.isAnonymous || user.banned) {
    return false;
  }
  const admins = await adminEmails();
  if (!admins.includes(user.email.toLowerCase())) {
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
};

export const adminFromHeaders = async (headers: Headers) => {
  const session = await auth.api.getSession({ headers });
  const user = session?.user as SessionUser | undefined;
  return (await isAdminUser(user)) ? (user as SessionUser) : null;
};
