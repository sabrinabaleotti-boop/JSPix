"use client";

import { useLayoutEffect, useRef } from "react";
import { formatBRL } from "@/lib/utils";

type Props = { value: number; format?: "brl" | "int" | "percent"; duration?: number; className?: string };

function fmt(v: number, format: Props["format"]) {
  if (format === "brl") return formatBRL(Math.round(v));
  if (format === "percent") return `${Math.round(v)}%`;
  return Math.round(v).toLocaleString("pt-BR");
}

/**
 * Número que sobe até o valor na primeira pintura. O servidor renderiza o valor final (sem salto de layout) e a
 * animação escreve direto no DOM, sem re-render por frame.
 */
export function CountUp({ value, format = "brl", duration = 900, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = fmt(value, format);
      shown.current = value;
      return;
    }
    const from = shown.current;
    el.textContent = fmt(from, format);
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      const v = from + (value - from) * eased;
      el.textContent = fmt(v, format);
      shown.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, format, duration]);

  return (
    <span ref={ref} className={className} suppressHydrationWarning>
      {fmt(value, format)}
    </span>
  );
}
