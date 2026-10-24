import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useId, useState } from "react";
import { toast } from "sonner";

import { Field, Logo } from "#/components/primitives";
import { SiteFooter } from "#/components/site-footer";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import { m } from "#/paraglide/messages.js";

function Shell({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col items-center px-4 py-10">
        <Link className="flex items-center" to="/">
          <Logo />
        </Link>
        <div className="my-auto w-full max-w-[380px] py-10">
          <h1 className="text-center font-semibold text-[28px] tracking-[-0.03em]">
            {title}
          </h1>
          <p className="mt-2 text-center text-[15px] text-muted-foreground">
            {sub}
          </p>
          {children}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function BackToLogin() {
  return (
    <p className="mt-6 text-center text-muted-foreground text-sm">
      <Link
        className="font-medium text-foreground underline-offset-4 hover:underline"
        to="/login"
      >
        {m.forgot_back()}
      </Link>
    </p>
  );
}

/** "Forgot password": ask for the email, send a reset link. */
export function ForgotPasswordForm() {
  const emailId = useId();
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const onSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setBusy(true);
    // Same answer whether or not the account exists (no account probing).
    await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setBusy(false);
    setSentTo(email);
  }, []);

  if (sentTo) {
    return (
      <Shell
        sub={m.forgot_sent_body({ email: sentTo })}
        title={m.forgot_sent_title()}
      >
        <BackToLogin />
      </Shell>
    );
  }
  return (
    <Shell sub={m.forgot_sub()} title={m.forgot_title()}>
      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <Field htmlFor={emailId} label={m.auth_email()}>
          <Input
            autoComplete="email"
            id={emailId}
            name="email"
            placeholder={m.auth_email_placeholder()}
            required
            type="email"
          />
        </Field>
        <Button className="mt-2 w-full" disabled={busy} size="lg" type="submit">
          {busy ? m.forgot_sending() : m.forgot_submit()}
        </Button>
      </form>
      <BackToLogin />
    </Shell>
  );
}

/** The page the reset email links to: set a new password with the token. */
export function ResetPasswordForm({ token }: { token: string }) {
  const passwordId = useId();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    token ? null : m.reset_invalid()
  );
  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const newPassword = String(
        new FormData(e.currentTarget).get("password") ?? ""
      );
      setBusy(true);
      const res = await authClient.resetPassword({ newPassword, token });
      setBusy(false);
      if (res.error) {
        setError(m.reset_invalid());
        return;
      }
      toast.success(m.reset_done());
      navigate({ to: "/login" });
    },
    [navigate, token]
  );

  return (
    <Shell sub={m.reset_sub()} title={m.reset_title()}>
      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <Field htmlFor={passwordId} label={m.reset_new()}>
          <Input
            autoComplete="new-password"
            id={passwordId}
            minLength={8}
            name="password"
            required
            type="password"
          />
        </Field>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button
          className="mt-2 w-full"
          disabled={busy || !token}
          size="lg"
          type="submit"
        >
          {busy ? m.reset_saving() : m.reset_submit()}
        </Button>
      </form>
      <BackToLogin />
    </Shell>
  );
}
