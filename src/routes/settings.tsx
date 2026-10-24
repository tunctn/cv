import {
  Camera01Icon,
  Loading03Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Icon } from "#/components/icon";
import { LanguageSelect } from "#/components/language-select";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import { ThemeSwitcher } from "#/components/theme-switcher";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
  deleteAccount,
  getAccount,
  removeAvatar,
  setAccountPassword,
  uploadAvatar,
} from "#/lib/account";
import { authClient } from "#/lib/auth-client";
import { MAX_AVATAR_INPUT, squareAvatar } from "#/lib/avatar-image";
import { getViewer } from "#/lib/cv/functions";
import { track } from "#/lib/track";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/settings")({
  loader: async () => {
    const viewer = await getViewer();
    if (!viewer || viewer.isAnonymous) {
      throw redirect({ to: "/signup" });
    }
    const account = await getAccount();
    if (!account) {
      throw redirect({ to: "/signup" });
    }
    return { viewer, account };
  },
  head: () => ({ meta: [{ title: m.settings_meta_title() }] }),
  component: Settings,
});

type Account = NonNullable<Awaited<ReturnType<typeof getAccount>>>;

const MIN_PASSWORD = 8;
const HEIC = /\.hei[cf]$/i;

/** A titled group of rows on a surface. */
function Group({
  title,
  description,
  children,
  danger,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <section>
      <h2
        className={
          danger
            ? "font-semibold text-[15px] text-destructive"
            : "font-semibold text-[15px]"
        }
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-0.5 text-[13.5px] text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="mt-3 divide-y overflow-hidden rounded-[20px] border bg-background">
        {children}
      </div>
    </section>
  );
}

/** Label (and hint) on the left, the control on the right; stacks on phones. */
function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
      <div className="min-w-0">
        <p className="font-medium text-[14px]">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div className="shrink-0 sm:max-w-[60%]">{children}</div>
    </div>
  );
}

function Settings() {
  const { viewer, account } = Route.useLoaderData();
  useEffect(() => {
    track("settings_opened");
  }, []);
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader viewer={viewer} />
      {/* rr-block: account details never appear in session replays. */}
      <main className="rr-block mx-auto w-full max-w-[720px] flex-1 px-4 pt-8 pb-24 sm:px-6 sm:pt-12">
        <h1 className="font-semibold text-[28px] tracking-[-0.03em] sm:text-[32px]">
          {m.settings_title()}
        </h1>
        <div className="mt-8 space-y-10">
          <ProfileGroup account={account} />
          <PasswordGroup account={account} />
          <Group title={m.settings_preferences()}>
            <Row label={m.settings_language()}>
              <LanguageSelect />
            </Row>
            <Row label={m.settings_theme()}>
              <ThemeSwitcher />
            </Row>
          </Group>
          <DangerGroup email={account.email} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProfileGroup({ account }: { account: Account }) {
  const router = useRouter();
  const [name, setName] = useState(account.name);
  const [saving, setSaving] = useState(false);
  const changed = name.trim() !== account.name && name.trim().length > 0;
  const save = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSaving(true);
      const res = await authClient.updateUser({ name: name.trim() });
      setSaving(false);
      if (res.error) {
        toast.error(m.settings_save_failed());
        return;
      }
      toast.success(m.settings_saved());
      router.invalidate();
    },
    [name, router]
  );
  const onName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value),
    []
  );
  const google = account.providers.includes("google");
  return (
    <Group title={m.settings_profile()}>
      <Row hint={m.settings_photo_hint()} label={m.settings_photo()}>
        <PhotoPicker account={account} />
      </Row>
      <Row label={m.settings_name()}>
        <form className="flex items-center gap-2" onSubmit={save}>
          <Input
            aria-label={m.settings_name()}
            autoComplete="name"
            className="w-full sm:w-[240px]"
            maxLength={80}
            onChange={onName}
            value={name}
          />
          <Button disabled={!changed || saving} type="submit" variant="outline">
            {m.settings_save()}
          </Button>
        </form>
      </Row>
      <Row
        hint={google ? m.settings_email_google() : m.settings_email_hint()}
        label={m.settings_email()}
      >
        <div className="flex items-center gap-3">
          <p className="truncate text-[14px] text-muted-foreground">
            {account.email}
          </p>
          {account.emailVerified || google ? null : (
            <VerifyEmail email={account.email} />
          )}
          {account.canChangeEmail ? <ChangeEmail /> : null}
        </div>
      </Row>
    </Group>
  );
}

/** For unconfirmed emails: (re)send the confirmation link. */
function VerifyEmail({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const send = useCallback(async () => {
    setBusy(true);
    const res = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/settings",
    });
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message ?? m.common_something_wrong());
    } else {
      toast.success(m.settings_verify_sent({ email }));
    }
  }, [email]);
  return (
    <Button disabled={busy} onClick={send} size="sm" variant="outline">
      {m.settings_verify()}
    </Button>
  );
}

/** "Change" next to the email: sends a confirmation link to the new address. */
function ChangeEmail() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const openDialog = useCallback(() => setOpen(true), []);
  const onEmail = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
    []
  );
  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSending(true);
      const res = await authClient.changeEmail({
        newEmail: email.trim(),
        callbackURL: "/settings",
      });
      setSending(false);
      if (res.error) {
        toast.error(m.settings_save_failed());
        return;
      }
      toast.success(m.settings_email_sent({ email: email.trim() }));
      setOpen(false);
      setEmail("");
    },
    [email]
  );
  return (
    <>
      <Button onClick={openDialog} size="sm" variant="outline">
        {m.settings_email_change()}
      </Button>
      <AlertDialog onOpenChange={setOpen} open={open}>
        <AlertDialogContent>
          <form onSubmit={submit}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {m.settings_email_change_title()}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {m.settings_email_change_body()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              aria-label={m.settings_email_new()}
              autoComplete="email"
              className="mt-4"
              onChange={onEmail}
              placeholder={m.auth_email_placeholder()}
              type="email"
              value={email}
            />
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel type="button">
                {m.common_cancel()}
              </AlertDialogCancel>
              <Button disabled={!email.includes("@") || sending} type="submit">
                {m.settings_email_send()}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Profile picture: click the avatar or "Upload", or drop an image on it. It is
 * cropped to a square and scaled to 256 px in the browser before upload.
 */
function PhotoPicker({ account }: { account: Account }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      if (!(file.type.startsWith("image/") || HEIC.test(file.name))) {
        toast.error(m.settings_photo_unsupported());
        return;
      }
      if (file.size > MAX_AVATAR_INPUT) {
        toast.error(m.settings_photo_too_large());
        return;
      }
      setBusy(true);
      try {
        let dataUrl: string;
        try {
          dataUrl = await squareAvatar(file);
        } catch (cause) {
          throw new Error(m.settings_photo_unsupported(), { cause });
        }
        await uploadAvatar({ data: { dataUrl } });
        await router.invalidate();
        toast.success(m.settings_photo_saved());
      } catch (err) {
        toast.error((err as Error).message || m.settings_photo_failed());
      } finally {
        setBusy(false);
      }
    },
    [router]
  );
  const remove = useCallback(async () => {
    setBusy(true);
    try {
      await removeAvatar();
      await router.invalidate();
    } catch {
      toast.error(m.settings_photo_failed());
    } finally {
      setBusy(false);
    }
  }, [router]);
  const pick = useCallback(() => input.current?.click(), []);
  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) {
        upload(file);
      }
    },
    [upload]
  );
  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setOver(true);
    }
  }, []);
  const onDragLeave = useCallback(() => setOver(false), []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setOver(false);
      const [file] = e.dataTransfer.files;
      if (file) {
        upload(file);
      }
    },
    [upload]
  );

  return (
    <div className="flex items-center gap-3">
      <button
        aria-label={m.settings_photo_upload()}
        className={cn(
          "group relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-full outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-foreground/30",
          over && "ring-2 ring-foreground/40"
        )}
        disabled={busy}
        onClick={pick}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        type="button"
      >
        <Avatar className="size-14">
          {account.image ? <AvatarImage alt="" src={account.image} /> : null}
          <AvatarFallback className="bg-surface font-medium text-[18px]">
            {(account.name || account.email).slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-opacity",
            busy || over
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
          )}
        >
          {busy ? (
            <Icon className="size-5 animate-spin" icon={Loading03Icon} />
          ) : (
            <Icon className="size-5" icon={Camera01Icon} />
          )}
        </span>
      </button>
      <Button disabled={busy} onClick={pick} size="sm" variant="outline">
        {m.settings_photo_upload()}
      </Button>
      {account.uploaded ? (
        <Button disabled={busy} onClick={remove} size="sm" variant="ghost">
          {m.settings_photo_remove()}
        </Button>
      ) : null}
      <input
        accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
        hidden
        onChange={onFile}
        ref={input}
        type="file"
      />
    </div>
  );
}

function PasswordGroup({ account }: { account: Account }) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);
  const onCurrent = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setCurrent(e.target.value),
    []
  );
  const onNext = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setNext(e.target.value),
    []
  );
  const valid =
    next.length >= MIN_PASSWORD && (!account.hasPassword || current.length > 0);
  const submit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        if (account.hasPassword) {
          const res = await authClient.changePassword({
            currentPassword: current,
            newPassword: next,
            revokeOtherSessions: true,
          });
          if (res.error) {
            throw new Error(m.settings_password_wrong());
          }
        } else {
          await setAccountPassword({ data: { newPassword: next } });
        }
        toast.success(m.settings_password_saved());
        setCurrent("");
        setNext("");
        router.invalidate();
      } catch (err) {
        toast.error((err as Error).message || m.settings_save_failed());
      } finally {
        setSaving(false);
      }
    },
    [account.hasPassword, current, next, router]
  );
  return (
    <Group
      description={
        account.hasPassword
          ? m.settings_password_desc()
          : m.settings_password_set_desc()
      }
      title={m.settings_password()}
    >
      <form className="space-y-3 px-5 py-4" onSubmit={submit}>
        {account.hasPassword ? (
          <Input
            aria-label={m.settings_password_current()}
            autoComplete="current-password"
            onChange={onCurrent}
            placeholder={m.settings_password_current()}
            type="password"
            value={current}
          />
        ) : null}
        <Input
          aria-label={m.settings_password_new()}
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          onChange={onNext}
          placeholder={m.auth_password_placeholder()}
          type="password"
          value={next}
        />
        <div className="flex justify-end">
          <Button disabled={!valid || saving} type="submit">
            {account.hasPassword
              ? m.settings_password_change()
              : m.settings_password_set()}
          </Button>
        </div>
      </form>
    </Group>
  );
}

function DangerGroup({ email }: { email: string }) {
  const navigate = useNavigate();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const matches = typed.trim().toLowerCase() === email.toLowerCase();
  const openDialog = useCallback(() => setOpen(true), []);
  const onOpenChange = useCallback((o: boolean) => {
    setOpen(o);
    if (!o) {
      setTyped("");
    }
  }, []);
  const onTyped = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTyped(e.target.value),
    []
  );
  const remove = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!matches) {
        return;
      }
      setDeleting(true);
      try {
        await deleteAccount({ data: { confirm: typed } });
        track("account_deleted");
        await authClient.signOut().catch(() => undefined);
        toast.success(m.settings_deleted());
        await router.invalidate();
        navigate({ to: "/" });
      } catch (err) {
        toast.error((err as Error).message || m.settings_save_failed());
        setDeleting(false);
      }
    },
    [matches, navigate, router, typed]
  );
  return (
    <Group danger title={m.settings_danger()}>
      <Row hint={m.settings_delete_hint()} label={m.settings_delete()}>
        <Button onClick={openDialog} variant="destructive">
          {m.settings_delete()}
        </Button>
      </Row>
      <AlertDialog onOpenChange={onOpenChange} open={open}>
        <AlertDialogContent>
          <form onSubmit={remove}>
            <AlertDialogHeader>
              <AlertDialogTitle>{m.settings_delete_title()}</AlertDialogTitle>
              <AlertDialogDescription>
                {m.settings_delete_body({ email })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              aria-label={m.settings_email()}
              autoComplete="off"
              className="mt-4"
              onChange={onTyped}
              placeholder={email}
              value={typed}
            />
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel type="button">
                {m.common_cancel()}
              </AlertDialogCancel>
              <Button
                disabled={!matches || deleting}
                type="submit"
                variant="destructive"
              >
                {deleting ? m.settings_deleting() : m.settings_delete_confirm()}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </Group>
  );
}
