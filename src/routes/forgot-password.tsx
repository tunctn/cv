import { createFileRoute } from "@tanstack/react-router";

import { ForgotPasswordForm } from "#/components/auth/password-reset";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: m.meta_title_forgot() }] }),
  component: ForgotPasswordForm,
});
