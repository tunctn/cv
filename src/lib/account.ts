import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "#/db";
import {
  account as accountTable,
  userAvatar,
  user as userTable,
} from "#/db/schema";
import { auth } from "#/lib/auth";
import { deleteUserAndFiles } from "#/lib/server/purge";
import { getSession } from "#/lib/server/session";
import { avatarKey, deleteObjects, putObject } from "#/lib/server/storage";
import { m } from "#/paraglide/messages.js";

const AVATAR_PATH = "/api/avatar/";
/** A 256×256 WebP (or PNG where the browser can't encode WebP), as a data URL. */
const AVATAR_DATA_URL =
  /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/;
const MAX_AVATAR_BYTES = 300 * 1024;

/** The signed-in, non-guest user, or an error. */
async function requireMember() {
  const session = await getSession();
  const u = session?.user as
    | (NonNullable<typeof session>["user"] & { isAnonymous?: boolean | null })
    | undefined;
  if (!u || u.isAnonymous) {
    throw new Error(m.err_not_signed_in());
  }
  return u;
}

/** What the settings page shows: profile, sign-in methods. */
export const getAccount = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await getSession();
    const u = session?.user as
      | (NonNullable<typeof session>["user"] & {
          isAnonymous?: boolean | null;
        })
      | undefined;
    if (!u || u.isAnonymous) {
      return null;
    }
    const accounts = await db
      .select({ providerId: accountTable.providerId })
      .from(accountTable)
      .where(eq(accountTable.userId, u.id));
    const providers = accounts.map((a) => a.providerId);
    const [avatar] = await db
      .select({ providerImage: userAvatar.providerImage })
      .from(userAvatar)
      .where(eq(userAvatar.userId, u.id));
    return {
      name: u.name,
      email: u.email,
      emailVerified: Boolean(u.emailVerified),
      image: u.image ?? null,
      /** An uploaded picture is set (so it can be removed). */
      uploaded: Boolean(avatar),
      providerImage: avatar?.providerImage ?? null,
      hasPassword: providers.includes("credential"),
      // On once email sending is set up (Better Auth user.changeEmail); Google
      // sign-ins keep the address Google gives them.
      canChangeEmail:
        Boolean(auth.options.user?.changeEmail?.enabled) &&
        providers.includes("credential"),
      providers,
    };
  }
);

/** Adds a password to an account that signs in with Google only. */
export const setAccountPassword = createServerFn({ method: "POST" })
  .validator(z.object({ newPassword: z.string().min(8).max(128) }))
  .handler(async ({ data }) => {
    await requireMember();
    await auth.api.setPassword({
      body: { newPassword: data.newPassword },
      headers: getRequestHeaders(),
    });
    return { ok: true };
  });

/**
 * Deletes the account and everything in it. CVs, their versions and chat
 * files, sessions and sign-in methods go with the user row (FK cascade);
 * stored files, the picture and photos no other CV uses leave R2 too.
 */
export const deleteAccount = createServerFn({ method: "POST" })
  .validator(z.object({ confirm: z.string() }))
  .handler(async ({ data }) => {
    const u = await requireMember();
    const typed = data.confirm.trim().toLowerCase();
    if (typed !== u.email.toLowerCase()) {
      throw new Error(m.settings_delete_mismatch());
    }
    await deleteUserAndFiles(u.id);
    return { ok: true };
  });

/** Stores an uploaded profile picture and points the user's image at it. */
export const uploadAvatar = createServerFn({ method: "POST" })
  .validator(z.object({ dataUrl: z.string().max(500_000) }))
  .handler(async ({ data }) => {
    const u = await requireMember();
    const match = AVATAR_DATA_URL.exec(data.dataUrl);
    if (!match) {
      throw new Error(m.settings_photo_failed());
    }
    const [, mediaType, base64] = match;
    if (Buffer.byteLength(base64, "base64") > MAX_AVATAR_BYTES) {
      throw new Error(m.settings_photo_too_large());
    }
    const [existing] = await db
      .select({ providerImage: userAvatar.providerImage })
      .from(userAvatar)
      .where(eq(userAvatar.userId, u.id));
    // Keep the sign-in provider's picture (Google) so "Remove" can restore it.
    const fromProvider =
      u.image && !u.image.startsWith(AVATAR_PATH) ? u.image : null;
    const providerImage = existing ? existing.providerImage : fromProvider;
    await putObject(avatarKey(u.id), Buffer.from(base64, "base64"), mediaType);
    await db
      .insert(userAvatar)
      .values({ userId: u.id, mediaType, providerImage })
      .onConflictDoUpdate({
        target: userAvatar.userId,
        set: { mediaType, data: null, updatedAt: new Date() },
      });
    const image = `${AVATAR_PATH}${u.id}?v=${Date.now()}`;
    await db.update(userTable).set({ image }).where(eq(userTable.id, u.id));
    return { image };
  });

/** Drops the uploaded picture; back to the Google one, or to initials. */
export const removeAvatar = createServerFn({ method: "POST" }).handler(
  async () => {
    const u = await requireMember();
    const [row] = await db
      .delete(userAvatar)
      .where(eq(userAvatar.userId, u.id))
      .returning({ providerImage: userAvatar.providerImage });
    await deleteObjects([avatarKey(u.id)]);
    const image = row?.providerImage ?? null;
    await db.update(userTable).set({ image }).where(eq(userTable.id, u.id));
    return { image };
  }
);
