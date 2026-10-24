import { toCanvas } from "html-to-image";
import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { m } from "#/paraglide/messages.js";

export interface ClipField {
  path: string;
  text: string;
}

export interface ClipResult {
  fields: ClipField[];
  /** PNG data URL of the selected area. */
  image: string | null;
}

interface Rect {
  h: number;
  w: number;
  x: number;
  y: number;
}

function intersects(a: DOMRect, r: Rect) {
  return (
    a.right > r.x && a.left < r.x + r.w && a.bottom > r.y && a.top < r.y + r.h
  );
}

function normalize(x0: number, y0: number, x1: number, y1: number): Rect {
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    w: Math.abs(x1 - x0),
    h: Math.abs(y1 - y0),
  };
}

async function capture(sheet: HTMLElement, r: Rect, scale: number) {
  const box = sheet.getBoundingClientRect();
  const ratio = 2;
  const full = await toCanvas(sheet, { pixelRatio: ratio, cacheBust: true });
  const sx = Math.max(0, ((r.x - box.left) / scale) * ratio);
  const sy = Math.max(0, ((r.y - box.top) / scale) * ratio);
  const sw = Math.min(full.width - sx, (r.w / scale) * ratio);
  const sh = Math.min(full.height - sy, (r.h / scale) * ratio);
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(sw));
  out.height = Math.max(1, Math.round(sh));
  out.getContext("2d")?.drawImage(full, sx, sy, sw, sh, 0, 0, sw, sh);
  return out.toDataURL("image/png");
}

/** Drag a rectangle over the pages to send that area (picture + text) to the AI. */
export function ClipOverlay({
  content,
  scale,
  onDone,
}: {
  content: RefObject<HTMLDivElement | null>;
  scale: number;
  onDone: (clip: ClipResult | null) => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDone(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  const onDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (start.current) {
      setRect(
        normalize(start.current.x, start.current.y, e.clientX, e.clientY)
      );
    }
  }, []);

  const onUp = useCallback(async () => {
    const r = rect;
    start.current = null;
    const root = content.current;
    if (!(r && root) || r.w < 8 || r.h < 8) {
      setRect(null);
      return;
    }
    setBusy(true);
    const fields: ClipField[] = [];
    for (const el of root.querySelectorAll<HTMLElement>(
      ".cv-sheet [data-edit-path]"
    )) {
      if (intersects(el.getBoundingClientRect(), r) && el.innerText.trim()) {
        fields.push({
          path: el.dataset.editPath ?? "",
          text: el.innerText.trim(),
        });
      }
    }
    const sheet = Array.from(
      root.querySelectorAll<HTMLElement>(".cv-sheet")
    ).find((s) => intersects(s.getBoundingClientRect(), r));
    let image: string | null = null;
    try {
      image = sheet ? await capture(sheet, r, scale) : null;
    } catch {
      image = null;
    }
    setBusy(false);
    setRect(null);
    onDone({ image, fields });
  }, [rect, content, scale, onDone]);

  return (
    <div
      className="absolute inset-0 z-30 cursor-crosshair bg-black/[0.03]"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      <p className="cv-clip-hint pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1.5 font-medium text-[13px] text-primary-foreground shadow-lg">
        {busy ? m.ed_clip_capturing() : m.ed_clip_hint()}
      </p>
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-[4px] border-2 border-[#3d63dd] bg-[#3d63dd]/10"
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
        />
      ) : null}
    </div>
  );
}
