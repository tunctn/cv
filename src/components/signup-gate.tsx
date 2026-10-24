import {
  Add01Icon,
  Mail01Icon,
  Tick02Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { Icon } from "#/components/icon";
import { CvThumb, GoogleIcon } from "#/components/primitives";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { authClient } from "#/lib/auth-client";
import { getAuthOptions } from "#/lib/cv/functions";
import { sampleCv } from "#/lib/cv/sample";
import { GUEST_AI_LIMIT } from "#/lib/guest";
import type { LimitKind } from "#/lib/guest";
import { track } from "#/lib/track";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

type Reason = "cv" | "ai";

let reason: Reason | null = null;

const listeners = new Set<() => void>();

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const snapshot = () => reason;

const serverSnapshot = () => null;

const setReason = (next: Reason | null) => {
  reason = next;
  for (const l of listeners) {
    l();
  }
};

let kind: LimitKind = "guest";

export const openSignupGate = (why: Reason, limit: LimitKind = "guest") => {
  track("guest_limit_hit", { limit: why, kind: limit });
  track("signup_gate_shown", { reason: why, kind: limit });
  kind = limit;
  setReason(why);
};

const PERKS = [m.gate_perk_cvs, m.gate_perk_ai, m.gate_perk_devices];

const VerifyGate = ({ reason: why }: { reason: Reason }) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    authClient
      .getSession()
      .then((s) => setEmail(s.data?.user.email ?? ""))
      .catch(() => {
        // No session to read: the address stays empty and resend is disabled.
      });
  }, []);
  const close = useCallback((open: boolean) => {
    if (!open) {
      setReason(null);
    }
  }, []);
  const dismiss = useCallback(() => setReason(null), []);
  const resend = useCallback(async () => {
    if (!email) {
      return;
    }
    await authClient.sendVerificationEmail({
      email,
      callbackURL: window.location.pathname,
    });
    setSent(true);
  }, [email]);
  return (
    <Dialog onOpenChange={close} open>
      <DialogContent className="gap-5 rounded-[28px] p-6 sm:max-w-[400px]">
        <span className="bg-surface flex size-11 items-center justify-center rounded-full">
          <Icon className="size-5" icon={Mail01Icon} />
        </span>
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-[19px] font-semibold tracking-[-0.01em]">
            {m.verify_gate_title()}
          </DialogTitle>
          <DialogDescription className="text-[14px]">
            {why === "ai"
              ? m.verify_gate_body_ai({ count: GUEST_AI_LIMIT, email })
              : m.verify_gate_body_cv({ email })}
          </DialogDescription>
        </DialogHeader>
        {sent ? (
          <p className="text-muted-foreground text-[13px]">
            {m.verify_gate_sent()}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button disabled={sent || !email} onClick={resend} size="lg">
            {m.verify_gate_resend()}
          </Button>
          <Button onClick={dismiss} size="lg" variant="ghost">
            {m.verify_gate_done()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Sheet = ({
  className,
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "absolute left-1/2 overflow-hidden rounded-[6px] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_30px_-8px_rgba(0,0,0,0.2)] ring-1 ring-black/[0.05] [backface-visibility:hidden]",
      className
    )}
    style={style}
  >
    {children}
  </div>
);

const Scene = ({ ai }: { ai: boolean }) => {
  const sample = useMemo(() => sampleCv(), []);
  return (
    <div
      aria-hidden
      className="relative m-2 mb-0 h-[184px] overflow-hidden rounded-[20px] bg-[radial-gradient(110%_100%_at_50%_0%,var(--surface-2),var(--surface)_72%)]"
    >
      <div className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black_58%,transparent_97%)]">
        {ai ? (
          <Sheet className="-ml-[60px] w-[120px]" style={{ top: 22 }}>
            <CvThumb cv={sample} template="classic" />
          </Sheet>
        ) : (
          <>
            <Sheet
              className="-ml-[52px] w-[104px] opacity-90"
              style={{
                top: 34,
                transform: "translate3d(-78px,0,0) rotate(-7deg)",
              }}
            >
              <CvThumb cv={sample} template="modern" />
            </Sheet>
            <Sheet
              className="-ml-[56px] w-[112px]"
              style={{ top: 20, zIndex: 2 }}
            >
              <CvThumb cv={sample} template="classic" />
            </Sheet>
            <div
              className="border-foreground/20 bg-background/60 absolute left-1/2 -ml-[52px] flex aspect-[210/297] w-[104px] items-center justify-center rounded-[6px] border-[1.5px] border-dashed"
              style={{
                top: 34,
                transform: "translate3d(92px,0,0) rotate(6deg)",
              }}
            >
              <span className="bg-foreground text-background flex size-8 items-center justify-center rounded-full">
                <Icon className="size-4" icon={Add01Icon} />
              </span>
            </div>
          </>
        )}
      </div>
      {ai ? (
        <div className="absolute inset-x-4 bottom-4 z-10 flex flex-col items-end gap-2">
          <div className="fade-in-0 slide-in-from-bottom-2 animate-in bg-foreground fill-mode-both text-background max-w-[78%] rounded-[16px] rounded-br-[6px] px-3 py-2 text-[12px] leading-snug shadow-[0_10px_24px_-8px_rgba(0,0,0,0.35)] duration-500 ease-out">
            {m.gate_scene_ask()}
          </div>
          <div className="fade-in-0 slide-in-from-bottom-2 animate-in bg-background fill-mode-both ring-foreground/[0.06] flex max-w-[86%] items-center gap-2 self-start rounded-full py-1.5 pr-3.5 pl-1.5 text-[12px] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.25)] ring-1 delay-300 duration-500 ease-out">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Icon className="size-3" icon={Tick02Icon} strokeWidth={2.5} />
            </span>
            <span className="truncate font-medium">{m.gate_scene_done()}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const GuestGate = ({ current }: { current: Reason | null }) => {
  const [google, setGoogle] = useState(false);
  useEffect(() => {
    if (current && !google) {
      getAuthOptions()
        .then((o) => setGoogle(o.googleEnabled))
        .catch(() => setGoogle(false));
    }
  }, [current, google]);

  const close = useCallback((open: boolean) => {
    if (!open) {
      setReason(null);
    }
  }, []);
  const toEmail = useCallback(() => {
    if (current) {
      track("signup_gate_click", { reason: current, method: "email" });
    }
    setReason(null);
  }, [current]);
  const toLogin = useCallback(() => {
    if (current) {
      track("signup_gate_click", { reason: current, method: "login" });
    }
    setReason(null);
  }, [current]);
  const next =
    typeof window === "undefined"
      ? "/cvs"
      : window.location.pathname + window.location.search;
  const withGoogle = useCallback(() => {
    if (current) {
      track("signup_gate_click", { reason: current, method: "google" });
    }
    authClient.signIn.social({ provider: "google", callbackURL: next });
  }, [next, current]);

  const ai = current === "ai";

  return (
    <Dialog onOpenChange={close} open={current !== null}>
      <DialogContent className="[&>[data-slot=dialog-close]]:bg-background/80 [&>[data-slot=dialog-close]]:ring-foreground/[0.08] grid-cols-[minmax(0,1fr)] gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-[400px] [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:right-4 [&>[data-slot=dialog-close]]:z-20 [&>[data-slot=dialog-close]]:size-8 [&>[data-slot=dialog-close]]:rounded-full [&>[data-slot=dialog-close]]:ring-1 [&>[data-slot=dialog-close]]:backdrop-blur">
        <Scene ai={ai} />
        <div className="flex flex-col gap-5 px-6 pt-5 pb-6">
          <DialogHeader className="gap-2 text-center sm:text-center">
            <DialogTitle className="text-[21px] leading-tight font-semibold tracking-[-0.02em] text-balance">
              {ai ? m.gate_title_ai() : m.gate_title_cv()}
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-relaxed text-pretty">
              {ai
                ? m.gate_body_ai({ count: GUEST_AI_LIMIT })
                : m.gate_body_cv()}
            </DialogDescription>
          </DialogHeader>

          <ul className="mx-auto flex flex-col gap-2">
            {PERKS.map((perk) => (
              <li
                className="text-foreground/80 flex items-center gap-2.5 text-[13px]"
                key={perk()}
              >
                <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">
                  <Icon
                    className="size-3"
                    icon={Tick02Icon}
                    strokeWidth={2.5}
                  />
                </span>
                {perk()}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2">
            {google ? (
              <Button className="h-12" onClick={withGoogle} size="lg">
                <GoogleIcon />
                {m.gate_google()}
              </Button>
            ) : null}
            <Button
              className="h-12"
              nativeButton={false}
              onClick={toEmail}
              render={<Link search={{ next }} to="/signup" />}
              size="lg"
              variant={google ? "secondary" : "default"}
            >
              <Icon data-icon="inline-start" icon={Mail01Icon} />
              {m.gate_email()}
            </Button>
            <Button
              className="text-muted-foreground"
              nativeButton={false}
              onClick={toLogin}
              render={<Link search={{ next }} to="/login" />}
              variant="ghost"
            >
              {m.gate_login()}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const SignupGate = () => {
  const current = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  if (current && kind === "verify") {
    return <VerifyGate reason={current} />;
  }
  return <GuestGate current={current} />;
};
