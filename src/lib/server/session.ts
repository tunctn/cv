import { getRequestHeaders } from "@tanstack/react-start/server";

import { auth } from "#/lib/auth";
import { m } from "#/paraglide/messages.js";

export const getSession = async () =>
  await auth.api.getSession({ headers: getRequestHeaders() });

export const requireUser = async () => {
  const session = await getSession();
  if (!session) {
    throw new Error(m.err_not_signed_in());
  }
  // Banned users keep no sessions, but a ban can land mid-session.
  if ((session.user as { banned?: boolean | null }).banned) {
    throw new Error(m.err_banned());
  }
  return session.user;
};
