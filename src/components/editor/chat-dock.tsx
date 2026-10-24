import { BubbleChatSparkIcon } from "@hugeicons-pro/core-stroke-rounded";
import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Icon } from "#/components/icon";

import {
  DOCK_COOKIE,
  DOCK_MAX_W,
  DOCK_MIN_W,
  type DockPrefs,
  type DockSide,
} from "#/lib/dock-prefs";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

const MIN_W = DOCK_MIN_W;
const MAX_W = DOCK_MAX_W;
/** Gap between the floating card and the edges of the work area. */
export const DOCK_GAP = 12;

/** Side and width of the chat card, saved in a cookie the server reads. */
export function useDock(initial: DockPrefs) {
  const [dock, setDock] = useState<DockPrefs>(initial);
  const update = useCallback((patch: Partial<DockPrefs>) => {
    setDock((d) => {
      const next = { ...d, ...patch };
      // biome-ignore lint/suspicious/noDocumentCookie: a plain, non-sensitive UI preference cookie
      document.cookie = `${DOCK_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);
  return { ...dock, update };
}

interface DockHandle {
  dragging: boolean;
  /** Spread on the element that moves the card (the chat header). */
  grab: {
    onPointerCancel: () => void;
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: () => void;
  };
  minimize: () => void;
}

const DockContext = createContext<DockHandle | null>(null);

/** Drag handlers and the minimise action of the surrounding chat card. */
export function useDockHandle() {
  return useContext(DockContext);
}

/**
 * The chat as a floating card over the work area (desktop). Grab its top bar
 * to move the whole card; let go and it glides to the nearest side. Drag the
 * inner edge to resize. On mobile it is a plain full-screen panel.
 */
export function ChatDock({
  area,
  side,
  width,
  minimized,
  onUpdate,
  visible,
  children,
}: {
  /** The positioned element the card floats in. */
  area: RefObject<HTMLElement | null>;
  side: DockSide;
  width: number;
  minimized: boolean;
  onUpdate: (patch: Partial<DockPrefs>) => void;
  /** Mobile: whether the chat tab is showing. Desktop always shows it. */
  visible: boolean;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const resizeStart = useRef<{ x: number; w: number } | null>(null);
  const pendingFlip = useRef<{ x: number; y: number } | null>(null);

  const restLeft = useCallback(
    (s: DockSide) => {
      const w = area.current?.clientWidth ?? 0;
      return s === "left" ? DOCK_GAP : w - width - DOCK_GAP;
    },
    [area, width]
  );

  const onGrabDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    // Buttons in the header (menu, minimise) keep working as buttons.
    // Portalled menus and dialogs bubble here through React; ignore them.
    const target = e.target as HTMLElement;
    if (
      !e.currentTarget.contains(target) ||
      target.closest("button") ||
      e.button !== 0
    ) {
      return;
    }
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
    setSettling(false);
    setDragging(true);
  }, []);

  const onGrabMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const d = drag.current;
      if (!d) {
        return;
      }
      // Keep the card inside the work area so dragging never scrolls the page.
      const areaW = area.current?.clientWidth ?? 0;
      const minX = -restLeft(side);
      const maxX = areaW - width - restLeft(side);
      setOffset({
        x: Math.min(maxX, Math.max(minX, e.clientX - d.x)),
        y: Math.min(DOCK_GAP * 4, Math.max(-DOCK_GAP, e.clientY - d.y)),
      });
    },
    [area, restLeft, side, width]
  );

  const onGrabUp = useCallback(() => {
    if (!drag.current) {
      return;
    }
    drag.current = null;
    setDragging(false);
    const areaW = area.current?.clientWidth ?? 0;
    const visualLeft = restLeft(side) + offset.x;
    const next: DockSide =
      visualLeft + width / 2 < areaW / 2 ? "left" : "right";
    if (next === side) {
      setSettling(true);
      setOffset({ x: 0, y: 0 });
      return;
    }
    // FLIP: after switching sides, start from where it was dropped and glide home.
    pendingFlip.current = { x: visualLeft - restLeft(next), y: offset.y };
    onUpdate({ side: next });
  }, [area, offset, onUpdate, restLeft, side, width]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the docked side changes
  useLayoutEffect(() => {
    const flip = pendingFlip.current;
    if (!flip) {
      return;
    }
    pendingFlip.current = null;
    setSettling(false);
    setOffset(flip);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        setSettling(true);
        setOffset({ x: 0, y: 0 });
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [side]);

  const onEdgeDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      resizeStart.current = { x: e.clientX, w: width };
    },
    [width]
  );
  const onEdgeMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const s = resizeStart.current;
      if (!s) {
        return;
      }
      const dx = side === "left" ? e.clientX - s.x : s.x - e.clientX;
      onUpdate({ width: Math.min(MAX_W, Math.max(MIN_W, s.w + dx)) });
    },
    [side, onUpdate]
  );
  const onEdgeUp = useCallback(() => {
    resizeStart.current = null;
  }, []);
  const onSettled = useCallback(() => setSettling(false), []);

  const moved = offset.x !== 0 || offset.y !== 0;
  const minimize = useCallback(() => onUpdate({ minimized: true }), [onUpdate]);
  const restore = useCallback(() => onUpdate({ minimized: false }), [onUpdate]);
  const handle = useMemo<DockHandle>(
    () => ({
      dragging,
      minimize,
      grab: {
        onPointerDown: onGrabDown,
        onPointerMove: onGrabMove,
        onPointerUp: onGrabUp,
        onPointerCancel: onGrabUp,
      },
    }),
    [dragging, minimize, onGrabDown, onGrabMove, onGrabUp]
  );

  return (
    <DockContext.Provider value={handle}>
      <aside
        className={cn(
          "min-h-0 w-full flex-col bg-background",
          "lg:absolute lg:top-3 lg:bottom-3 lg:z-30 lg:w-(--dock-w) lg:overflow-hidden lg:rounded-[24px] lg:ring-1 lg:ring-foreground/[0.07]",
          side === "left"
            ? "lg:left-3 lg:origin-bottom-left"
            : "lg:right-3 lg:origin-bottom-right",
          dragging
            ? "lg:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_24px_64px_rgba(0,0,0,0.18)]"
            : "lg:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.10)]",
          visible ? "flex" : "hidden",
          // Minimised: stays mounted (a reply keeps streaming), just hidden.
          minimized
            ? "lg:hidden"
            : "lg:fade-in-0 lg:zoom-in-95 lg:flex lg:animate-in lg:duration-200 lg:ease-out"
        )}
        onTransitionEnd={onSettled}
        style={
          {
            "--dock-w": `${width}px`,
            transform:
              moved || dragging
                ? `translate(${offset.x}px, ${offset.y}px) scale(${dragging ? 1.01 : 1})`
                : undefined,
            transition: settling
              ? "transform 340ms cubic-bezier(0.19, 1, 0.22, 1), box-shadow 200ms ease"
              : "box-shadow 200ms ease",
          } as React.CSSProperties
        }
      >
        <div className="min-h-0 flex-1">{children}</div>
        <div
          aria-hidden
          className={cn(
            "absolute top-6 bottom-6 z-10 hidden w-2 cursor-col-resize lg:block",
            side === "left" ? "right-0" : "left-0"
          )}
          onPointerCancel={onEdgeUp}
          onPointerDown={onEdgeDown}
          onPointerMove={onEdgeMove}
          onPointerUp={onEdgeUp}
        />
      </aside>
      {minimized ? (
        <button
          className={cn(
            "absolute bottom-3 z-30 hidden h-11 cursor-pointer items-center gap-2 rounded-full bg-background pr-4 pl-3.5 font-medium text-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-foreground/[0.07] transition-transform duration-150 ease-out active:scale-[0.97] lg:flex",
            "fade-in-0 zoom-in-90 animate-in duration-200",
            side === "left"
              ? "left-3 origin-bottom-left"
              : "right-3 origin-bottom-right"
          )}
          onClick={restore}
          type="button"
        >
          <Icon className="size-4.5" icon={BubbleChatSparkIcon} />
          {m.ed_chat()}
        </button>
      ) : null}
    </DockContext.Provider>
  );
}
