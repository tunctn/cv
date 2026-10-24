import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

import type { Path } from "#/lib/cv/paths";

interface Anchor {
  left: number;
  top: number;
  width: number;
}

const sameAnchor = (a: Anchor | null, b: Anchor | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width);

/** Where the element for `path` sits inside `container`, measured after each render. */
export const useAnchor = (
  container: RefObject<HTMLElement | null>,
  path: Path
) => {
  const [pos, setPos] = useState<Anchor | null>(null);
  useLayoutEffect(() => {
    const update = () => {
      const root = container.current;
      const el = root?.querySelector<HTMLElement>(
        `.cv-sheet [data-sel="${CSS.escape(path)}"]`
      );
      let next: Anchor | null = null;
      if (root && el) {
        const r = el.getBoundingClientRect();
        const c = root.getBoundingClientRect();
        next = { top: r.top - c.top, left: r.left - c.left, width: r.width };
      }
      // Keep the old object when nothing moved, so this settles.
      setPos((prev) => (sameAnchor(prev, next) ? prev : next));
    };
    const frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  });
  return pos;
};
