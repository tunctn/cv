import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ResetPasswordForm } from "#/components/auth/password-reset";
import { m } from "#/paraglide/messages.js";

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

function Page() {
  const { token } = Route.useSearch();
  return <ResetPasswordForm token={token} />;
}
