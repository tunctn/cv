import { createFileRoute, redirect, getRouteApi } from "@tanstack/react-router";

import { AuthForm } from "#/components/auth/auth-form";
import { getAuthOptions, getViewer } from "#/lib/cv/functions";
import { getLastLoginMethod } from "#/lib/last-login";
import { m } from "#/paraglide/messages.js";

const routeApi = getRouteApi("/login");

const Page = () => {
  const { googleEnabled, isGuest, lastUsed } = routeApi.useLoaderData();
  return (
    // rr-block: the sign-in form never appears in session replays.
    <div className="rr-block contents">
      <AuthForm
        googleEnabled={googleEnabled}
        isGuest={isGuest}
        lastUsed={lastUsed}
        mode="login"
      />
    </div>
  );
};

export const Route = createFileRoute("/login")({
  loader: async () => {
    const [viewer, options, lastUsed] = await Promise.all([
      getViewer(),
      getAuthOptions(),
      getLastLoginMethod(),
    ]);
    if (viewer && !viewer.isAnonymous) {
      throw redirect({ to: "/cvs" });
    }
    return {
      googleEnabled: options.googleEnabled,
      isGuest: Boolean(viewer?.isAnonymous),
      lastUsed,
    };
  },
  head: () => ({ meta: [{ title: m.meta_title_login() }] }),
  component: Page,
});
