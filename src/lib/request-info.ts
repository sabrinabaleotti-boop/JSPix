import { headers } from "next/headers";

/** URL pública do app (para montar webhooks). PUBLIC_URL tem prioridade sobre os cabeçalhos. */
export async function publicBaseUrl() {
  const env = process.env.PUBLIC_URL?.trim().replace(/\/$/, "");
  if (env) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Primeiro IPv4 da cadeia x-forwarded-for (a Legacy exige IPv4 do pagador para o antifraude). */
export async function payerIpv4() {
  const h = await headers();
  const chain = [h.get("x-forwarded-for") ?? "", h.get("x-real-ip") ?? ""].join(",");
  for (const raw of chain.split(",")) {
    const ip = raw.trim().replace(/^::ffff:/, "");
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return ip;
  }
  return "127.0.0.1";
}
