import {
  Delete02Icon,
  FileExportIcon,
  MinusSignIcon,
  MoreHorizontalIcon,
  Share08Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useCallback, useState } from "react";

import { Icon } from "#/components/icon";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

import { useDockHandle } from "../chat-dock";

export type DockTab = "chat" | "history";

/**
 * Top of the chat card: Chat/History tabs, grab it to move the card
 * (desktop), chat settings (export, share, clear) and minimise.
 */
export function ChatHeader({
  tab,
  onTab,
  hasMessages,
  onExport,
  onShare,
  onClear,
}: {
  tab: DockTab;
  onTab: (tab: DockTab) => void;
  hasMessages: boolean;
  onExport: () => void;
  onShare: () => void;
  onClear: () => void;
}) {
  const dock = useDockHandle();
  const [confirm, setConfirm] = useState(false);
  const askClear = useCallback(() => setConfirm(true), []);
  const clear = useCallback(() => {
    setConfirm(false);
    onClear();
  }, [onClear]);

  return (
    <div
      className={cn(
        "flex h-12 shrink-0 touch-none select-none items-center gap-1 border-b pr-2 pl-4",
        dock?.dragging ? "lg:cursor-grabbing" : "lg:cursor-grab"
      )}
      {...dock?.grab}
    >
      <div
        aria-label={m.chat_panel()}
        className="-ml-2 flex items-center gap-0.5"
        role="tablist"
      >
        <TabButton
          active={tab === "chat"}
          id="chat"
          label={m.ed_chat()}
          onTab={onTab}
        />
        <TabButton
          active={tab === "history"}
          id="history"
          label={m.chat_tab_history()}
          onTab={onTab}
        />
      </div>
      <div className="ml-auto flex items-center gap-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                aria-label={m.chat_settings()}
                className="text-muted-foreground"
                size="icon-sm"
                variant="ghost"
              />
            }
          >
            <Icon icon={MoreHorizontalIcon} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem disabled={!hasMessages} onClick={onExport}>
              <Icon icon={FileExportIcon} /> {m.chat_export()}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Icon icon={Share08Icon} /> {m.chat_share()}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!hasMessages}
              onClick={askClear}
              variant="destructive"
            >
              <Icon icon={Delete02Icon} /> {m.chat_clear()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {dock ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={m.chat_minimise_aria()}
                  className="hidden text-muted-foreground lg:inline-flex"
                  onClick={dock.minimize}
                  size="icon-sm"
                  variant="ghost"
                />
              }
            >
              <Icon icon={MinusSignIcon} />
            </TooltipTrigger>
            <TooltipContent>{m.chat_minimise()}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <AlertDialog onOpenChange={setConfirm} open={confirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.chat_clear_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.chat_clear_body()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
            <AlertDialogAction onClick={clear} variant="destructive">
              {m.chat_clear()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TabButton({
  id,
  label,
  active,
  onTab,
}: {
  id: DockTab;
  label: string;
  active: boolean;
  onTab: (tab: DockTab) => void;
}) {
  const pick = useCallback(() => onTab(id), [id, onTab]);
  return (
    <button
      aria-selected={active}
      className={cn(
        "h-8 rounded-full px-3 font-medium text-[13px] transition-colors",
        active
          ? "bg-surface text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
      onClick={pick}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
}
