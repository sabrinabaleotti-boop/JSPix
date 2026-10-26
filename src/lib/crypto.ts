import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

function key() {
  const hex = process.env.SECRETS_ENCRYPTION_KEY ?? "";
  if (hex.length !== 64) throw new Error("SECRETS_ENCRYPTION_KEY deve ter 64 caracteres hex (openssl rand -hex 32)");
  return Buffer.from(hex, "hex");
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(packed: string) {
  const [iv, tag, enc] = packed.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}
