/** "1.234,56" | "1234,56" | "12.5" | "R$ 10" -> centavos. NaN se inválido. */
export function parseMoneyToCents(v: string) {
  let s = String(v ?? "").replace(/[^\d,.-]/g, "");
  if (!s) return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** "5,5" | "5.50" | "5%" -> 5.5. NaN se inválido. */
export function parsePercent(v: string) {
  const s = String(v ?? "").replace(/[^\d,.]/g, "").replace(",", ".");
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

export function centsToInput(c: number | null | undefined) {
  return c == null ? "" : (c / 100).toFixed(2).replace(".", ",");
}

export function percentToInput(p: number | string | null | undefined) {
  if (p == null || p === "") return "";
  return Number(p).toFixed(2).replace(".", ",");
}
