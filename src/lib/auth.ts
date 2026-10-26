import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const CLIENT_COOKIE = "jpix_client";
const ADMIN_COOKIE = "jpix_admin";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error("JWT_SECRET não configurado");
  return new TextEncoder().encode(s);
}

type Audience = "client" | "admin";

async function sign(sub: string, aud: Audience, days: number) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(secret());
}

async function verify(token: string | undefined, aud: Audience) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { audience: aud });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function createClientSession(clientId: string) {
  const token = await sign(clientId, "client", 30);
  (await cookies()).set(CLIENT_COOKIE, token, { ...cookieOpts, maxAge: 60 * 60 * 24 * 30 });
}

export async function getClientId() {
  return verify((await cookies()).get(CLIENT_COOKIE)?.value, "client");
}

export async function clearClientSession() {
  (await cookies()).delete(CLIENT_COOKIE);
}

export async function createAdminSession(adminId: string) {
  const token = await sign(adminId, "admin", 7);
  (await cookies()).set(ADMIN_COOKIE, token, { ...cookieOpts, maxAge: 60 * 60 * 24 * 7 });
}

export async function getAdminId() {
  return verify((await cookies()).get(ADMIN_COOKIE)?.value, "admin");
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}
