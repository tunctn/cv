import {
  DashboardSquare02Icon,
  Files02Icon,
  Logout05Icon,
  Settings02Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useCallback } from "react";
import { GitHubButton } from "#/components/github-button";
import { Icon } from "#/components/icon";
import { Logo } from "#/components/primitives";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { authClient } from "#/lib/auth-client";
import { m } from "#/paraglide/messages.js";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isAnonymous: boolean;
  isAdmin?: boolean;
} | null;

export function SiteHeader({
  viewer,
  children,
}: {
  viewer: Viewer;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-transparent border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-4 px-4 sm:px-6">
        <Link className="flex shrink-0 items-center" to="/">
          <Logo />
        </Link>
        {viewer ? (
          <nav className="ms-4 hidden items-center gap-1 text-sm sm:flex">
            <Link
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
              to="/cvs"
            >
              {m.common_my_cvs()}
            </Link>
          </nav>
        ) : null}
        <div className="ms-auto flex items-center gap-2">
          {children}
          <div className="hidden sm:block">
            <GitHubButton />
          </div>
          <AccountArea viewer={viewer} />
        </div>
      </div>
    </header>
  );
}

export function AccountArea({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const navigate = useNavigate();
  const openCvs = useCallback(() => navigate({ to: "/cvs" }), [navigate]);
  const openSettings = useCallback(
    () => navigate({ to: "/settings" }),
    [navigate]
  );
  const openAdmin = useCallback(() => navigate({ to: "/admin" }), [navigate]);
  const logOut = useCallback(async () => {
    await authClient.signOut();
    await router.invalidate();
    navigate({ to: "/" });
  }, [navigate, router]);
  if (!viewer || viewer.isAnonymous) {
    return (
      <>
        <Button
          className="hidden sm:inline-flex"
          nativeButton={false}
          render={<Link to="/login" />}
          variant="ghost"
        >
          {m.common_log_in()}
        </Button>
        <Button nativeButton={false} render={<Link to="/signup" />}>
          {m.common_sign_up()}
        </Button>
      </>
    );
  }
  const initials = (viewer.name || viewer.email).slice(0, 1).toUpperCase();
  // Email sign-ups get the address's local part as their name; showing both
  // would repeat the email.
  const [local] = viewer.email.split("@");
  const showName = Boolean(
    viewer.name && viewer.name !== viewer.email && viewer.name !== local
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label={m.header_account()}
            className="cursor-pointer rounded-full outline-none"
            type="button"
          >
            <Avatar className="size-8">
              {viewer.image ? <AvatarImage alt="" src={viewer.image} /> : null}
              <AvatarFallback className="bg-surface font-medium text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-1.5">
          {showName ? (
            <p className="truncate font-medium text-foreground text-sm">
              {viewer.name}
            </p>
          ) : null}
          <p
            className={
              showName
                ? "truncate text-muted-foreground text-xs"
                : "truncate font-medium text-foreground text-sm"
            }
          >
            {viewer.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openCvs}>
          <Icon icon={Files02Icon} /> {m.common_my_cvs()}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openSettings}>
          <Icon icon={Settings02Icon} /> {m.settings_menu()}
        </DropdownMenuItem>
        {viewer.isAdmin ? (
          <DropdownMenuItem onClick={openAdmin}>
            <Icon icon={DashboardSquare02Icon} /> {m.header_admin()}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={logOut}>
          <Icon icon={Logout05Icon} /> {m.header_log_out()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
