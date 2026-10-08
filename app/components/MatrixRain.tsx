"use client";

import { useEffect, useRef } from "react";

const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ0123456789ABCDEFZ$#*/\\{}[]<>=+";
const SIZE = 14;

/** Parse the admin-configurable --brand-color (hex) with a red fallback. */
function brandRgb(): [number, number, number] {
  try {
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue("--brand-color")
      .trim();
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(raw);
    if (m) {
      const h = m[1];
      if (h.length === 3) {
        return [
          parseInt(h[0] + h[0], 16),
          parseInt(h[1] + h[1], 16),
          parseInt(h[2] + h[2], 16),
        ];
      }
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ];
    }
  } catch {
    /* fall through */
  }
  return [220, 38, 38];
}

/**
 * Lightweight matrix-rain canvas for the landing hero, painted in the
 * site's brand color. Renders one static frame when the user prefers
 * reduced motion.
 */
export function MatrixRain({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const [br, bg, bb] = brandRgb();
    // Base glyphs sit at 0.72 so the rain reads clearly through the page's
    // opacity layer and vignette; heads paint at full alpha for contrast.
    const dim = `rgba(${br},${bg},${bb},0.72)`;
    const bright = `rgba(${Math.min(br + 90, 255)},${Math.min(bg + 90, 255)},${Math.min(
      bb + 90,
      255
    )},1)`;

    let columns = 0;
    let drops: number[] = [];
    let raf = 0;
    let last = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = w;
      canvas.height = h;
      columns = Math.ceil(w / SIZE);
      drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -40));
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
    };

    const paintStatic = () => {
      ctx.font = SIZE + "px monospace";
      for (let i = 0; i < columns; i++) {
        for (let row = 0; row < Math.ceil(canvas.height / SIZE); row += 3) {
          if (Math.random() > 0.75) {
            ctx.fillStyle = dim;
            ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * SIZE, row * SIZE);
          }
        }
      }
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 50) return; // ~20fps: smooth falling without burning CPU
      last = t;
      // Light per-frame fade: trails persist long enough to read as streaks.
      ctx.fillStyle = "rgba(0,0,0,0.055)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = SIZE + "px monospace";
      for (let i = 0; i < columns; i++) {
        const glyph = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        ctx.fillStyle = Math.random() > 0.94 ? bright : dim;
        ctx.fillText(glyph, i * SIZE, drops[i] * SIZE);
        if (drops[i] * SIZE > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };

    resize();

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      paintStatic();
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
