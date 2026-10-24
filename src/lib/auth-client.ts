import {
  anonymousClient,
  lastLoginMethodClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { track } from "#/lib/track";

/** Product analytics for sign-in and sign-up, wherever they are started. */
function trackAuth(url: string) {
  if (url.includes("/sign-up/email")) {
    track("signup", { method: "email" });
  } else if (url.includes("/sign-in/email")) {
    track("login", { method: "email" });
  } else if (url.includes("/sign-in/social")) {
    track("login_started", { method: "google" });
  } else if (url.includes("/sign-in/anonymous")) {
    track("guest_started");
  } else if (url.includes("/delete-user")) {
    track("account_deleted");
  }
}

export const authClient = createAuthClient({
  plugins: [anonymousClient(), lastLoginMethodClient()],
  fetchOptions: {
    onSuccess: (ctx) => trackAuth(String(ctx.request.url)),
  },
});
