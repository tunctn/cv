import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback, useId, useState } from "react";

import { Field, GoogleIcon, Logo } from "#/components/primitives";
import { SiteFooter } from "#/components/site-footer";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { authClient } from "#/lib/auth-client";
import type { LastLoginMethod } from "#/lib/last-login";
import { m } from "#/paraglide/messages.js";

const SAFE_PATH = /^\/(?!\/)/u;

const nextPath = () => {
  if (typeof window === "undefined") {
    return "/cvs";
  }
  const next = new URLSearchParams(window.location.search).get("next");
  return next && SAFE_PATH.test(next) ? next : "/cvs";
};

const signInWithGoogle = () => {
  authClient.signIn.social({ provider: "google", callbackURL: nextPath() });
};

const subtitle = (mode: "login" | "signup", isGuest: boolean) => {
  if (isGuest) {
    return m.auth_sub_guest();
  }
  return mode === "signup" ? m.auth_sub_signup() : m.auth_sub_login();
};

const submitLabel = (mode: "login" | "signup", busy: boolean) => {
  if (busy) {
    return m.auth_busy();
  }
  return mode === "signup" ? m.common_sign_up() : m.common_log_in();
};

const LastUsedBadge = ({ className }: { className?: string }) => (
  <span
    className={`bg-surface text-muted-foreground pointer-events-none rounded-full px-2 py-0.5 text-[11px] leading-4 font-medium ${className ?? ""}`}
  >
    {m.auth_last_used()}
  </span>
);

export const AuthForm = ({
  mode,
  googleEnabled,
  isGuest,
  lastUsed,
}: {
  mode: "login" | "signup";
  googleEnabled: boolean;
  isGuest: boolean;
  lastUsed: LastLoginMethod;
}) => {
  const router = useRouter();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      const email = String(f.get("email"));
      const password = String(f.get("password"));
      setBusy(true);
      setError(null);
      const res =
        mode === "signup"
          ? await authClient.signUp.email({
              email,
              password,
              name: String(f.get("name") || email.split("@")[0]),
            })
          : await authClient.signIn.email({ email, password });
      setBusy(false);
      if (res.error) {
        setError(res.error.message ?? m.common_something_wrong());
        return;
      }
      await router.invalidate();
      navigate({ href: nextPath() });
    },
    [mode, navigate, router]
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex flex-1 flex-col items-center px-4 py-10">
        <Link className="flex items-center" to="/">
          <Logo />
        </Link>
        <div className="my-auto w-full max-w-[380px] py-10">
          <h1 className="text-center text-[28px] font-semibold tracking-[-0.03em]">
            {mode === "signup" ? m.auth_title_signup() : m.auth_title_login()}
          </h1>
          <p className="text-muted-foreground mt-2 text-center text-[15px]">
            {subtitle(mode, isGuest)}
          </p>

          {googleEnabled ? (
            <>
              <Button
                className="relative mt-8 w-full"
                onClick={signInWithGoogle}
                size="lg"
                variant="outline"
              >
                <GoogleIcon /> {m.auth_google()}
                {lastUsed === "google" ? (
                  <LastUsedBadge className="absolute end-2.5 top-1/2 -translate-y-1/2" />
                ) : null}
              </Button>
              <div className="text-muted-foreground my-6 flex items-center gap-3 text-xs">
                <span className="bg-border h-px flex-1" />
                {m.auth_or()}
                <span className="bg-border h-px flex-1" />
              </div>
            </>
          ) : null}

          <form
            className={googleEnabled ? "grid gap-4" : "mt-8 grid gap-4"}
            onSubmit={onSubmit}
          >
            {mode === "signup" && (
              <Field htmlFor={nameId} label={m.auth_name()}>
                <Input
                  autoComplete="name"
                  id={nameId}
                  name="name"
                  placeholder={m.auth_name_placeholder()}
                />
              </Field>
            )}
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
            <Field htmlFor={passwordId} label={m.auth_password()}>
              <Input
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                id={passwordId}
                minLength={8}
                name="password"
                placeholder={
                  mode === "signup" ? m.auth_password_placeholder() : ""
                }
                required
                type="password"
              />
            </Field>
            {mode === "login" ? (
              <Link
                className="text-muted-foreground hover:text-foreground ms-auto -mt-2 text-[13px] underline-offset-4 hover:underline"
                to="/forgot-password"
              >
                {m.auth_forgot_link()}
              </Link>
            ) : null}
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            {lastUsed === "email" ? (
              <LastUsedBadge className="ms-auto mt-1 -mb-2" />
            ) : null}
            <Button
              className="mt-2 w-full"
              disabled={busy}
              size="lg"
              type="submit"
            >
              {submitLabel(mode, busy)}
            </Button>
          </form>

          <p className="text-muted-foreground mt-6 text-center text-sm">
            {mode === "signup" ? m.auth_have_account() : m.auth_new_here()}{" "}
            <Link
              className="text-foreground font-medium underline-offset-4 hover:underline"
              to={mode === "signup" ? "/login" : "/signup"}
            >
              {mode === "signup" ? m.common_log_in() : m.auth_create_account()}
            </Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
};
