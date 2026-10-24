import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "#/lib/auth";
import { m } from "#/paraglide/messages.js";

export async function getSession() {
  return await auth.api.getSession({ headers: getRequestHeaders() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    throw new Error(m.err_not_signed_in());
  }
  // Banned users keep no sessions, but a ban can land mid-session.
  if ((session.user as { banned?: boolean | null }).banned) {
    throw new Error(m.err_banned());
  }
  return session.user;
}
