import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

/** Set by Better Auth's lastLoginMethod plugin after a sign-in. */
export const LAST_LOGIN_COOKIE = "better-auth.last_used_login_method";

export type LastLoginMethod = "google" | "email" | null;

/**
 * The sign-in method used last time, read on the server so the
 * "Last used" badge is in the first render (no flash).
 */
export const getLastLoginMethod = createServerFn({ method: "GET" }).handler(
  (): LastLoginMethod => {
    const value = getCookie(LAST_LOGIN_COOKIE);
    return value === "google" || value === "email" ? value : null;
  }
);
