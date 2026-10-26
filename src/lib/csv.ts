/** CSV no formato do Excel em português: separador ";", vírgula decimal e BOM UTF-8. */
export type Cell = string | number | Date | null | undefined;

const fmt = (v: Cell) => {
  if (v == null) return "";
  if (v instanceof Date) return v.toLocaleString("pt-BR");
  return String(v);
};

const quote = (s: string) => (/[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function centsCell(c: number | null | undefined) {
  return c == null ? "" : (c / 100).toFixed(2).replace(".", ",");
}

export function toCsv(header: string[], rows: Cell[][]) {
  const lines = [header, ...rows].map((r) => r.map((v) => quote(fmt(v))).join(";"));
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function csvResponse(name: string, body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
