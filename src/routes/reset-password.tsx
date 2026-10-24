import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { z } from "zod";

import { ResetPasswordForm } from "#/components/auth/password-reset";
import { m } from "#/paraglide/messages.js";

const routeApi = getRouteApi("/reset-password");

const Page = () => {
  const { token } = routeApi.useSearch();
  return <ResetPasswordForm token={token} />;
};

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({ token: z.string().catch("") }),
  head: () => ({
    meta: [
      { title: m.meta_title_forgot() },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});
