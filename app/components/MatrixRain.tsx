"use client";

import { useEffect, useRef } from "react";

const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ0123456789ABCDEFZ$#*/\\{}[]<>=+";
const SIZE = 14;

/**
 * Lightweight matrix-rain canvas for the landing hero.
 * Renders one static frame when the user prefers reduced motion.
 */
export function MatrixRain({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
            ctx.fillStyle = "rgba(34,197,94,0.35)";
            ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * SIZE, row * SIZE);
          }
        }
      }
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < 66) return; // ~15fps is plenty for rain
      last = t;
      ctx.fillStyle = "rgba(0,0,0,0.09)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = SIZE + "px monospace";
      for (let i = 0; i < columns; i++) {
        const glyph = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        ctx.fillStyle =
          Math.random() > 0.975 ? "rgba(134,239,172,0.85)" : "rgba(34,197,94,0.5)";
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
