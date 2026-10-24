import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, anonymous, lastLoginMethod } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";

import { db, schema } from "#/db";
import { aiUsage, cvFile } from "#/db/schema";
import { readConsent } from "#/lib/consent";
import { sendAccountEmail } from "#/lib/server/email";
import { m } from "#/paraglide/messages.js";

const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // "Forgot password": the link opens /reset-password?token=…
    sendResetPassword: async ({ user, url }) => {
      await sendAccountEmail("reset", { to: user.email, url });
    },
    resetPasswordTokenExpiresIn: 60 * 60,
  },
  emailVerification: {
    // A confirmation link after sign-up; signing in doesn't wait for it.
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      if (!(user as { isAnonymous?: boolean }).isAnonymous) {
        await sendAccountEmail("verify", { to: user.email, url });
      }
    },
  },
  // Account deletion runs through deleteAccount (src/lib/account.ts), which
  // also cleans up stored photos; this enables Better Auth's own endpoint too.
  user: {
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        await sendAccountEmail("delete", { to: user.email, url });
      },
    },
    // Changing the email is approved from the current address first; the
    // new address then gets its own confirmation link.
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        await sendAccountEmail("change", {
          to: user.email,
          url,
          email: newEmail,
        });
      },
    },
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          prompt: "select_account",
        },
      }
    : {},
  plugins: [
    anonymous({
      // Guest CVs follow the user into their real account.
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        // Everything the guest made moves to the new account before the
        // guest user is deleted: CVs (with their chat and history) and the
        // files attached in the chat.
        await db
          .update(schema.cv)
          .set({ userId: newUser.user.id })
          .where(eq(schema.cv.userId, anonymousUser.user.id));
        await db
          .update(cvFile)
          .set({ userId: newUser.user.id })
          .where(eq(cvFile.userId, anonymousUser.user.id));
        // AI spend stays attributed to the person (admin page).
        await db
          .update(aiUsage)
          .set({ userId: newUser.user.id })
          .where(eq(aiUsage.userId, anonymousUser.user.id));
      },
    }),
    // Cookie only (storeInDatabase off): powers the "Last used" badge. A
    // functional cookie, so only set with the visitor's consent.
    lastLoginMethod({
      beforeStoreCookie: (ctx) =>
        readConsent(
          ctx.request?.headers.get("cookie") ?? ctx.headers?.get("cookie")
        ).functional,
    }),
    // Ban fields + refusing sessions for banned users. Its own endpoints need
    // role "admin", which nobody has; /admin uses ADMIN_EMAILS instead.
    admin({ bannedUserMessage: () => m.err_banned() }),
    tanstackStartCookies(),
  ],
});

export const authConfig = { googleEnabled };
