/** What a guest (anonymous user) may do before signing up. */
export const GUEST_CV_LIMIT = 1;
export const GUEST_AI_LIMIT = 3;
/** Error message/code the server uses when a guest hits a limit. */
export const GUEST_LIMIT = "GUEST_LIMIT";

/** Same limits for signed-up accounts whose email isn't confirmed yet. */
export const VERIFY_LIMIT = "VERIFY_LIMIT";

export type LimitKind = "guest" | "verify";

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error ?? "");
}

/** Which limit an error stands for, if any. */
export function limitOf(error: unknown): LimitKind | null {
  const message = messageOf(error);
  if (message.includes(VERIFY_LIMIT)) {
    return "verify";
  }
  return message.includes(GUEST_LIMIT) ? "guest" : null;
}

export function isGuestLimit(error: unknown) {
  return limitOf(error) !== null;
}

/** Guests and unconfirmed accounts get the free limits; null means none. */
export function limitKindFor(user: {
  isAnonymous?: boolean | null;
  emailVerified?: boolean | null;
}): LimitKind | null {
  if (user.isAnonymous) {
    return "guest";
  }
  return user.emailVerified ? null : "verify";
}
/** Cookie holding the browser's visitor id (set for guests). */
export const DEVICE_COOKIE = "cv_vid";
