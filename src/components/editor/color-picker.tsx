import {
  ColorPickerIcon,
  Tick02Icon,
} from "@hugeicons-pro/core-stroke-rounded";
import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Icon } from "#/components/icon";
import { Button } from "#/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { ACCENTS } from "#/lib/cv/fonts";
import { m } from "#/paraglide/messages.js";

interface Hsv {
  h: number;
  s: number;
  v: number;
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RECENT_KEY = "cv:recent-colours";
const RECENT_MAX = 6;

function parseHex(input: string): string | null {
  const match = HEX.exec(input.trim());
  if (!match) {
    return null;
  }
  const raw =
    match[1].length === 3 ? [...match[1]].map((c) => c + c).join("") : match[1];
  return `#${raw.toLowerCase()}`;
}

function hexToHsv(hex: string): Hsv {
  const raw = (parseHex(hex) ?? "#000000").slice(1);
  const [r, g, b] = [0, 2, 4].map(
    (at) => Number.parseInt(raw.slice(at, at + 2), 16) / 255
  );
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  let h = 0;
  if (d > 0) {
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
  }
  return {
    h: (h * 60 + 360) % 360,
    s: max === 0 ? 0 : (d / max) * 100,
    v: max * 100,
  };
}

function hsvToHex({ h, s, v }: Hsv) {
  const sv = s / 100;
  const vv = v / 100;
  const f = (k: number) => {
    const x = (k + h / 60) % 6;
    const c = vv - vv * sv * Math.max(0, Math.min(x, 4 - x, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(5)}${f(3)}${f(1)}`;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

function readRecent(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(list)
      ? list.filter((c): c is string => typeof c === "string" && HEX.test(c))
      : [];
  } catch {
    return [];
  }
}

function saveRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // Private mode or blocked storage: recents just aren't remembered.
  }
}

/** Calls `fn` at most once per animation frame with the latest value. */
function useFrameThrottle(fn: (hex: string) => void) {
  const pending = useRef<string | null>(null);
  const frame = useRef<number | null>(null);
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(
    () => () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
      }
    },
    []
  );
  return useCallback((hex: string) => {
    pending.current = hex;
    if (frame.current !== null) {
      return;
    }
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (pending.current) {
        latest.current(pending.current);
      }
    });
  }, []);
}

const isPreset = (c: string) =>
  ACCENTS.some((a) => a.toLowerCase() === c.toLowerCase());

/** Accent colour: preset swatches, recent picks and an inline HSV picker. */
export function ColorPicker({
  accent,
  onPick,
}: {
  accent: string;
  onPick: (accent: string) => void;
}) {
  const [recent, setRecent] = useState<string[]>([]);
  const onOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setRecent(readRecent());
        return;
      }
      const hex = parseHex(accent);
      if (!hex || isPreset(hex)) {
        return;
      }
      const next = [hex, ...readRecent().filter((c) => c !== hex)].slice(
        0,
        RECENT_MAX
      );
      saveRecent(next);
      setRecent(next);
    },
    [accent]
  );

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <Button aria-label={m.ed_accent_colour()} variant="ghost">
            <span
              className="size-4 rounded-full ring-1 ring-black/10"
              style={{ background: accent }}
            />
            {m.ed_colour()}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-[264px] gap-0">
        <p className="font-medium text-[13px]">{m.ed_accent_colour()}</p>
        <div className="mt-2.5 grid grid-cols-[repeat(6,28px)] justify-between gap-y-2">
          {ACCENTS.map((c) => (
            <Swatch accent={accent} color={c} key={c} onPick={onPick} />
          ))}
          {recent
            .filter((c) => !isPreset(c))
            .map((c) => (
              <Swatch accent={accent} color={c} key={c} onPick={onPick} />
            ))}
        </div>
        <HsvPicker accent={accent} onPick={onPick} />
      </PopoverContent>
    </Popover>
  );
}

function Swatch({
  color,
  accent,
  onPick,
}: {
  color: string;
  accent: string;
  onPick: (accent: string) => void;
}) {
  const pick = useCallback(() => onPick(color), [color, onPick]);
  const active = color.toLowerCase() === accent.toLowerCase();
  const { v, s } = hexToHsv(color);
  const light = v > 75 && s < 35;
  return (
    <button
      aria-label={color}
      aria-pressed={active}
      className="flex size-7 cursor-pointer items-center justify-center rounded-full outline-none ring-1 ring-black/10 transition-transform focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2 focus-visible:ring-offset-popover active:scale-95"
      onClick={pick}
      style={{ background: color }}
      type="button"
    >
      {active ? (
        <Icon
          className={light ? "size-3.5 text-black" : "size-3.5 text-white"}
          icon={Tick02Icon}
        />
      ) : null}
    </button>
  );
}

interface EyeDropperCtor {
  new (): { open: () => Promise<{ sRGBHex: string }> };
}

function HsvPicker({
  accent,
  onPick,
}: {
  accent: string;
  onPick: (accent: string) => void;
}) {
  const [hsv, setHsv] = useState(() => hexToHsv(accent));
  const [draft, setDraft] = useState<string | null>(null);
  const emit = useFrameThrottle(onPick);
  // A hue survives greys (s or v at 0), so keep the local HSV unless the
  // accent changed from elsewhere (a swatch, undo, the AI).
  const last = useRef(hsvToHex(hsv));
  useEffect(() => {
    if (parseHex(accent) !== last.current) {
      const next = hexToHsv(accent);
      last.current = hsvToHex(next);
      setHsv(next);
    }
  }, [accent]);

  const update = useCallback(
    (patch: Partial<Hsv>) => {
      setHsv((prev) => {
        const next = { ...prev, ...patch };
        const hex = hsvToHex(next);
        last.current = hex;
        emit(hex);
        return next;
      });
    },
    [emit]
  );

  const [dropper, setDropper] = useState<EyeDropperCtor | null>(null);
  useEffect(() => {
    const ctor = (window as unknown as { EyeDropper?: EyeDropperCtor })
      .EyeDropper;
    setDropper(() => ctor ?? null);
  }, []);
  const pickFromScreen = useCallback(async () => {
    if (!dropper) {
      return;
    }
    try {
      const { sRGBHex } = await new dropper().open();
      const hex = parseHex(sRGBHex);
      if (hex) {
        onPick(hex);
      }
    } catch {
      // Cancelled with Escape.
    }
  }, [dropper, onPick]);

  const onHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft(e.target.value);
      const hex = parseHex(e.target.value);
      if (hex && e.target.value.replace("#", "").length === 6) {
        onPick(hex);
      }
    },
    [onPick]
  );
  const commitHex = useCallback(() => {
    if (draft !== null) {
      const hex = parseHex(draft);
      if (hex) {
        onPick(hex);
      }
    }
    setDraft(null);
  }, [draft, onPick]);
  const onHexKey = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        commitHex();
      }
    },
    [commitHex]
  );

  const hex = hsvToHex(hsv);
  return (
    <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
      <SatValArea hsv={hsv} onChange={update} />
      <HueSlider color={hex} hue={hsv.h} onChange={update} />
      <div className="flex items-center gap-2">
        <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[8px] bg-surface pr-2 pl-1.5 text-[13px] focus-within:ring-2 focus-within:ring-foreground/15">
          <span
            className="size-5 shrink-0 rounded-[6px] ring-1 ring-black/10"
            style={{ background: hex }}
          />
          <span className="text-muted-foreground">#</span>
          <input
            aria-label={m.ed_hex_colour()}
            autoComplete="off"
            className="w-0 min-w-0 flex-1 bg-transparent font-mono text-[12.5px] uppercase tabular-nums tracking-wide outline-none"
            maxLength={7}
            onBlur={commitHex}
            onChange={onHexChange}
            onKeyDown={onHexKey}
            spellCheck={false}
            value={draft ?? hex.slice(1)}
          />
        </label>
        {dropper ? (
          <button
            aria-label={m.ed_pick_screen_aria()}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[8px] bg-surface text-muted-foreground outline-none transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/15"
            onClick={pickFromScreen}
            title={m.ed_pick_screen()}
            type="button"
          >
            <Icon className="size-4" icon={ColorPickerIcon} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Thumb radius in px. Thumb centres stay this far inside the track edges. */
const INSET = 8;

/** Where a thumb centre sits for a 0–1 fraction along a track. */
const along = (f: number) =>
  `calc(${INSET}px + (100% - ${INSET * 2}px) * ${f})`;

/** Pointer drag on an element, reporting the position as 0–1 fractions. */
function useDrag(onMove: (x: number, y: number) => void) {
  const move = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      onMove(
        clamp((e.clientX - r.left - INSET) / (r.width - INSET * 2), 0, 1),
        clamp((e.clientY - r.top - INSET) / (r.height - INSET * 2), 0, 1)
      );
    },
    [onMove]
  );
  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) {
        return;
      }
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.focus();
      move(e);
    },
    [move]
  );
  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        move(e);
      }
    },
    [move]
  );
  return { onPointerDown, onPointerMove };
}

const THUMB =
  "pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.25)] ring-2 ring-white transition-[box-shadow] group-focus-visible:shadow-[0_0_0_5px_rgba(0,0,0,0.12),0_1px_4px_rgba(0,0,0,0.25)]";

function SatValArea({
  hsv,
  onChange,
}: {
  hsv: Hsv;
  onChange: (patch: Partial<Hsv>) => void;
}) {
  const drag = useDrag(
    useCallback(
      (x: number, y: number) => onChange({ s: x * 100, v: (1 - y) * 100 }),
      [onChange]
    )
  );
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 10 : 1;
      const moves: Record<string, Partial<Hsv>> = {
        ArrowLeft: { s: clamp(hsv.s - step, 0, 100) },
        ArrowRight: { s: clamp(hsv.s + step, 0, 100) },
        ArrowUp: { v: clamp(hsv.v + step, 0, 100) },
        ArrowDown: { v: clamp(hsv.v - step, 0, 100) },
      };
      const patch = moves[e.key];
      if (patch) {
        e.preventDefault();
        onChange(patch);
      }
    },
    [hsv, onChange]
  );
  return (
    <div
      aria-label={m.ed_sat_bright()}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(hsv.s)}
      aria-valuetext={m.ed_sat_bright_value({
        s: Math.round(hsv.s),
        v: Math.round(hsv.v),
      })}
      className="group relative aspect-[3/2] cursor-crosshair touch-none rounded-[10px] outline-none ring-1 ring-black/5 ring-inset"
      onKeyDown={onKeyDown}
      role="slider"
      style={{
        background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
      }}
      tabIndex={0}
      {...drag}
    >
      <span
        className={THUMB}
        style={{
          left: along(hsv.s / 100),
          top: along(1 - hsv.v / 100),
          background: hsvToHex(hsv),
        }}
      />
    </div>
  );
}

function HueSlider({
  color,
  hue,
  onChange,
}: {
  /** The current colour, shown in the thumb like the square's thumb. */
  color: string;
  hue: number;
  onChange: (patch: Partial<Hsv>) => void;
}) {
  const drag = useDrag(
    useCallback(
      (x: number) => onChange({ h: Math.min(x * 360, 359.9) }),
      [onChange]
    )
  );
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? 15 : 1;
      let h: number | null = null;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        h = hue - step;
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        h = hue + step;
      } else if (e.key === "Home") {
        h = 0;
      } else if (e.key === "End") {
        h = 359;
      }
      if (h !== null) {
        e.preventDefault();
        onChange({ h: clamp(h, 0, 359.9) });
      }
    },
    [hue, onChange]
  );
  return (
    <div
      aria-label={m.ed_hue()}
      aria-valuemax={360}
      aria-valuemin={0}
      aria-valuenow={Math.round(hue)}
      className="group relative h-3 cursor-pointer touch-none rounded-full outline-none ring-1 ring-black/5 ring-inset"
      onKeyDown={onKeyDown}
      role="slider"
      style={{
        // The rainbow spans the thumb's travel, so the colour under the thumb is its hue.
        background: `linear-gradient(to right, #f00 ${INSET}px, #ff0, #0f0, #0ff, #00f, #f0f, #f00 calc(100% - ${INSET}px))`,
      }}
      tabIndex={0}
      {...drag}
    >
      <span
        className={THUMB}
        style={{ left: along(hue / 360), top: "50%", background: color }}
      />
    </div>
  );
}
