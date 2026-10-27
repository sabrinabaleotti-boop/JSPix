"use server";

import bcrypt from "bcryptjs";
import { randomBytes, randomInt } from "crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { clearAdminSession, createAdminSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { onlyDigits } from "@/lib/masks";
import { parseMoneyToCents, parsePercent } from "@/lib/money";
import { keyEnvironment, testConnection, getSecretKey, createRecipient, createRecipientKycLink, RECIPIENTS_TAG } from "@/lib/pagarme";
import { withdraw, type WithdrawState } from "@/lib/withdraw";
import { buildRecipientPayload } from "@/lib/recipient-input";
import { createLegacyPayout, getLegacyWebhookToken, legacyWhoami, saveLegacyCredentials, LegacyError, PIX_KEY_TYPES, type PixKeyType } from "@/lib/legacy";
import { clientBalance } from "@/lib/finance";
import { parseRules, saveSplitDefault, validateRules } from "@/lib/split";
import { Prisma } from "@prisma/client";
import { mapLegacyPayoutStatus, refreshPayout } from "@/lib/payouts";
import { publicBaseUrl } from "@/lib/request-info";
import { cancelRemote, isConfigured } from "@/lib/gateway";
import { reconcileCharge } from "@/lib/charges";
import { deleteSettings, setSetting } from "@/lib/settings";
import { processPagarmeEvent } from "@/lib/webhooks";

export type FormState = { error?: string; ok?: string };

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ---------- Sessão ----------

const loginAttempts = new Map<string, { n: number; until: number }>();
// Hash real usado quando o e-mail não existe, para o tempo de resposta não revelar quais e-mails são válidos.
const DUMMY_HASH = bcrypt.hashSync("jpix-dummy-password", 12);

export async function adminLogin(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const a = loginAttempts.get(email);
  if (a && a.until > Date.now() && a.n >= 5) return { error: "Muitas tentativas. Aguarde 15 minutos." };

  const admin = await db.admin.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !ok) {
    const cur = loginAttempts.get(email);
    loginAttempts.set(email, { n: (cur && cur.until > Date.now() ? cur.n : 0) + 1, until: Date.now() + 15 * 60_000 });
    return { error: "E-mail ou senha inválidos" };
  }
  loginAttempts.delete(email);
  await createAdminSession(admin.id);
  redirect("/admin");
}

export async function adminLogout() {
  await clearAdminSession();
  redirect("/admin/login");
}

// ---------- Clientes ----------

async function uniqueCode() {
  for (let i = 0; i < 20; i++) {
    const code = String(randomInt(100000, 1000000));
    if (!(await db.client.findUnique({ where: { accessCode: code } }))) return code;
  }
  throw new Error("Não foi possível gerar um código único");
}

export async function saveClient(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  let accessCode = onlyDigits(str(fd, "accessCode"));
  const active = fd.get("active") === "on";

  if (name.length < 2) return { error: "Informe o nome do cliente" };
  if (!accessCode && !id) accessCode = await uniqueCode();
  if (accessCode.length < 4 || accessCode.length > 8) return { error: "O código deve ter de 4 a 8 dígitos" };

  const optPercent = (k: string) => {
    const v = str(fd, k);
    if (!v) return null;
    const n = parsePercent(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error("Percentual inválido");
    return n;
  };
  const optCents = (k: string) => {
    const v = str(fd, k);
    if (!v) return null;
    const n = parseMoneyToCents(v);
    if (!Number.isFinite(n) || n < 0) throw new Error("Valor inválido");
    return n;
  };
  const optInt = (k: string) => {
    const v = str(fd, k);
    if (!v) return null;
    const n = Number(onlyDigits(v));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  let numbers;
  try {
    numbers = {
      feePercent: optPercent("feePercent"),
      feeFixedCents: optCents("feeFixed"),
      minAmountCents: optCents("minAmount"),
      maxAmountCents: optCents("maxAmount"),
      defaultExpiryMin: optInt("defaultExpiryMin"),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }

  const clash = await db.client.findUnique({ where: { accessCode } });
  if (clash && clash.id !== id) return { error: "Esse código já está em uso por outro cliente" };

  const payoutPixKey = str(fd, "payoutPixKey") || null;
  const payoutPixKeyType = str(fd, "payoutPixKeyType") || null;
  if (payoutPixKey && !PIX_KEY_TYPES.includes(payoutPixKeyType as (typeof PIX_KEY_TYPES)[number])) return { error: "Escolha o tipo da chave Pix de repasse" };

  const data = {
    name,
    accessCode,
    active,
    payoutPixKey,
    payoutPixKeyType: payoutPixKey ? payoutPixKeyType : null,
    ...numbers,
  };

  if (id) {
    await db.client.update({ where: { id }, data });
    revalidatePath("/admin/clientes");
    revalidatePath(`/admin/clientes/${id}`);
    return { ok: "Cliente salvo" };
  }
  const created = await db.client.create({ data });
  revalidatePath("/admin/clientes");
  redirect(`/admin/clientes/${created.id}?novo=1`);
}

export async function regenerateCode(id: string) {
  await requireAdmin();
  await db.client.update({ where: { id }, data: { accessCode: await uniqueCode() } });
  revalidatePath(`/admin/clientes/${id}`);
  revalidatePath("/admin/clientes");
}

// ---------- Cobranças ----------

export async function adminReconsultCharge(id: string) {
  await requireAdmin();
  const c = await db.charge.findUnique({ where: { id } });
  if (c) await reconcileCharge(c);
  revalidatePath("/admin/cobrancas");
}

export async function adminCancelCharge(id: string) {
  await requireAdmin();
  const c = await db.charge.findUnique({ where: { id } });
  if (!c || c.status !== "pending") return;
  try {
    await cancelRemote(c);
  } catch (e) {
    console.error("cancel failed", e);
    return;
  }
  await db.charge.update({ where: { id }, data: { status: "canceled" } });
  revalidatePath("/admin/cobrancas");
}

// ---------- Repasses ----------

export async function createPayout(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const clientId = str(fd, "clientId");
  const method = str(fd, "method") === "legacy" ? "legacy" : "manual";
  const amountCents = parseMoneyToCents(str(fd, "amount"));
  const note = str(fd, "note") || null;
  const receiptUrl = str(fd, "receiptUrl") || null;
  const dateStr = str(fd, "paidAt");

  const client = await db.client.findUnique({ where: { id: clientId } });
  if (!client) return { error: "Escolha o cliente" };
  if (!Number.isFinite(amountCents) || amountCents < 1) return { error: "Informe um valor válido" };
  if (receiptUrl && !/^https?:\/\//.test(receiptUrl)) return { error: "O link do comprovante deve começar com http:// ou https://" };

  const balance = await clientBalance(clientId);
  if (amountCents > balance) {
    return { error: `O valor passa do saldo a repassar desse cliente (${(balance / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})` };
  }

  if (method === "manual") {
    const paidAt = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
    if (Number.isNaN(paidAt.getTime())) return { error: "Data inválida" };
    await db.payout.create({ data: { clientId, amountCents, paidAt, note, receiptUrl, method: "manual", status: "completed" } });
    revalidatePath("/admin/financeiro", "layout");
    return { ok: "Repasse registrado" };
  }

  // Envio real pela Legacy: exige chave Pix cadastrada e confirmação explícita.
  if (!(await isConfigured("legacy"))) return { error: "Configure as chaves da Legacy para enviar Pix pelo painel" };
  if (!client.payoutPixKey || !client.payoutPixKeyType) return { error: "Cadastre a chave Pix de repasse e o tipo dela no cliente" };
  if (fd.get("confirm") !== "on") return { error: "Marque a confirmação do envio" };

  const payout = await db.payout.create({
    data: {
      clientId,
      amountCents,
      paidAt: new Date(),
      note,
      method: "legacy",
      status: "pending",
      pixKey: client.payoutPixKey,
      pixKeyType: client.payoutPixKeyType,
    },
  });
  try {
    const token = await getLegacyWebhookToken();
    const remote = await createLegacyPayout({
      amountCents,
      pixKey: client.payoutPixKey,
      pixKeyType: client.payoutPixKeyType as PixKeyType,
      referenceId: payout.id,
      beneficiaryName: client.name,
      webhookUrl: `${await publicBaseUrl()}/api/webhooks/legacy?token=${token}`,
    });
    await db.payout.update({ where: { id: payout.id }, data: { gatewayId: remote.id, status: mapLegacyPayoutStatus(remote.status) } });
  } catch (e) {
    const msg = e instanceof LegacyError ? e.message : "Falha ao enviar o Pix";
    await db.payout.update({ where: { id: payout.id }, data: { status: "failed", failureReason: msg } });
    revalidatePath("/admin/financeiro", "layout");
    return { error: `A Legacy recusou o repasse: ${msg}` };
  }
  revalidatePath("/admin/financeiro", "layout");
  return { ok: "Pix de repasse enviado pela Legacy. O status atualiza sozinho pelo webhook." };
}

export async function deletePayout(id: string) {
  await requireAdmin();
  const p = await db.payout.findUnique({ where: { id } });
  // Repasses enviados pela Legacy não são apagados: o dinheiro saiu de fato. Só registros manuais ou que falharam.
  if (!p || (p.method === "legacy" && p.status !== "failed")) return;
  await db.payout.delete({ where: { id } });
  revalidatePath("/admin/financeiro", "layout");
}

export async function refreshPayoutAction(id: string) {
  await requireAdmin();
  try {
    await refreshPayout(id);
  } catch (e) {
    console.error("refresh payout failed", e);
  }
  revalidatePath("/admin/financeiro", "layout");
}

// ---------- Saque ----------

export async function withdrawAction(recipientId: string, amountCents: number, idempotencyKey: string): Promise<WithdrawState> {
  await requireAdmin();
  return withdraw(recipientId, amountCents, idempotencyKey);
}

// ---------- Split ----------

export async function saveSplitDefaultAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const enabled = fd.get("enabled") === "on";
  const rules = parseRules(str(fd, "rules"));
  if (enabled) {
    const err = validateRules(rules);
    if (err) return { error: err };
  }
  await saveSplitDefault({ enabled, rules: enabled ? rules : rules.filter((r) => r.recipientId) });
  revalidatePath("/admin/configuracoes/split");
  return { ok: enabled ? "Split padrão salvo. Vale para as próximas cobranças da Pagar.me." : "Split padrão desligado." };
}

export async function saveClientSplit(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "clientId");
  const mode = str(fd, "mode");
  let splitConfig: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
  if (mode === "none") splitConfig = { mode: "none" };
  if (mode === "custom") {
    const rules = parseRules(str(fd, "rules"));
    const err = validateRules(rules);
    if (err) return { error: err };
    splitConfig = { mode: "custom", rules };
  }
  await db.client.update({ where: { id }, data: { splitConfig } });
  revalidatePath(`/admin/clientes/${id}`);
  return { ok: mode === "custom" ? "Split próprio salvo" : mode === "none" ? "Este cliente não usa split" : "Este cliente usa o split padrão" };
}

// ---------- Gateway ----------

export async function selectGateway(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const g = str(fd, "gateway");
  if (g !== "pagarme" && g !== "legacy") return { error: "Gateway inválida" };
  await setSetting("gateway", g);
  revalidatePath("/admin", "layout");
  const ready = await isConfigured(g);
  return { ok: ready ? "Gateway ativa alterada. Vale para as próximas cobranças." : "Gateway escolhida, mas sem credenciais: as cobranças seguem simuladas até configurar." };
}

export async function saveLegacy(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const publicKey = str(fd, "publicKey");
  const secretKey = str(fd, "secretKey");
  if (!publicKey.startsWith("pk_") || !secretKey.startsWith("sk_")) return { error: "Informe a Public Key (pk_live_…) e a Secret Key (sk_live_…)" };
  try {
    const who = await legacyWhoami({ publicKey, secretKey });
    await saveLegacyCredentials(publicKey, secretKey);
    revalidatePath("/admin", "layout");
    return who.canTransact
      ? { ok: `Chaves salvas. Conta ${who.companyName} pronta para transacionar.` }
      : { ok: `Chaves salvas, mas a conta ${who.companyName} ainda não pode transacionar (${who.reason ?? who.kycStatus}).` };
  } catch (e) {
    return { error: e instanceof LegacyError && e.status === 401 ? "A Legacy recusou as chaves" : `Falha ao validar: ${(e as Error).message}` };
  }
}

export async function testLegacy(): Promise<FormState> {
  await requireAdmin();
  if (!(await isConfigured("legacy"))) return { error: "Chaves da Legacy não configuradas" };
  try {
    const who = await legacyWhoami();
    return who.canTransact
      ? { ok: `Conectado: ${who.companyName}. Métodos: ${who.paymentMethods.join(", ")}` }
      : { error: `Conectado a ${who.companyName}, mas sem permissão para transacionar: ${who.reason ?? who.kycStatus}` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function removeLegacyKeys() {
  await requireAdmin();
  await deleteSettings(["legacy_public_key", "legacy_secret_enc"]);
  revalidatePath("/admin", "layout");
}

export async function saveLegacyWebhookSecret(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const secret = str(fd, "webhookSecret");
  if (!secret) {
    await deleteSettings(["legacy_webhook_secret_enc"]);
    revalidatePath("/admin/configuracoes/webhook");
    return { ok: "Verificação de assinatura desligada" };
  }
  if (!secret.startsWith("whsec_")) return { error: "O segredo da Legacy começa com whsec_" };
  await setSetting("legacy_webhook_secret_enc", encryptSecret(secret));
  revalidatePath("/admin/configuracoes/webhook");
  return { ok: "Segredo salvo. Eventos sem assinatura válida passam a ser recusados." };
}

// ---------- Configurações ----------

export async function savePagarme(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const key = str(fd, "secretKey");
  if (!key) return { error: "Cole a secret key (sk_test_… ou sk_…)" };
  if (!keyEnvironment(key)) return { error: "A chave deve começar com sk_test_ ou sk_" };
  try {
    await testConnection(key);
  } catch (e) {
    return { error: `A Pagar.me recusou a chave: ${(e as Error).message}` };
  }
  await setSetting("pagarme_secret_enc", encryptSecret(key));
  updateTag(RECIPIENTS_TAG);
  revalidatePath("/admin/configuracoes/gateway");
  return { ok: `Chave ${keyEnvironment(key) === "test" ? "de teste" : "de produção"} salva e validada` };
}

// ---------- Recebedores (Pagar.me) ----------

export async function createRecipientAction(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  if (!(await getSecretKey())) return { error: "Configure a chave da Pagar.me antes de cadastrar recebedores." };
  const built = buildRecipientPayload(fd);
  if ("error" in built) return { error: built.error };
  try {
    const r = await createRecipient(built.payload);
    updateTag(RECIPIENTS_TAG);
    return { ok: `Recebedor criado (${r.id}${r.status ? `, status ${r.status}` : ""}). Gere o link de prova de vida na lista de recebedores.` };
  } catch (e) {
    return { error: `A Pagar.me recusou o cadastro: ${(e as Error).message}` };
  }
}

export type KycLinkState = { error?: string; url?: string; expiresAt?: string | null };

export async function recipientKycLinkAction(recipientId: string): Promise<KycLinkState> {
  await requireAdmin();
  try {
    const r = await createRecipientKycLink(recipientId);
    return { url: r.url, expiresAt: r.expiresAt };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function refreshRecipientsAction(): Promise<FormState> {
  await requireAdmin();
  updateTag(RECIPIENTS_TAG);
  return { ok: "Lista atualizada" };
}

export async function testPagarme(): Promise<FormState> {
  await requireAdmin();
  if (!(await getSecretKey())) return { error: "Nenhuma chave configurada. O sistema está em modo simulado." };
  try {
    await testConnection();
    return { ok: "Conexão com a Pagar.me funcionando" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function removePagarmeKey() {
  await requireAdmin();
  await deleteSettings(["pagarme_secret_enc"]);
  updateTag(RECIPIENTS_TAG);
  revalidatePath("/admin/configuracoes/gateway");
}

export async function generateWebhookCredentials() {
  await requireAdmin();
  await setSetting("webhook_user", "jpix");
  await setSetting("webhook_pass_enc", encryptSecret(randomBytes(18).toString("base64url")));
  await setSetting("webhook_token", randomBytes(24).toString("base64url"));
  await deleteSettings(["webhook_last_rejected"]);
  revalidatePath("/admin/configuracoes/webhook");
}

export async function reprocessWebhookEvent(id: string) {
  await requireAdmin();
  const ev = await db.webhookEvent.findUnique({ where: { id } });
  if (!ev) return;
  try {
    const note = await processPagarmeEvent(ev.payload as { id: string; type: string; data?: unknown });
    await db.webhookEvent.update({ where: { id }, data: { processed: true, error: note.startsWith("ignorado") ? note : null } });
  } catch (e) {
    await db.webhookEvent.update({ where: { id }, data: { error: (e as Error).message } });
  }
  revalidatePath("/admin/configuracoes/webhook");
}

export async function saveFees(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const fee = parsePercent(str(fd, "feePercent"));
  const gw = parsePercent(str(fd, "gatewayFeePercent"));
  const fixed = parseMoneyToCents(str(fd, "feeFixed") || "0");
  const withdrawFee = parseMoneyToCents(str(fd, "withdrawFee") || "0");
  const min = parseMoneyToCents(str(fd, "minAmount") || "1");
  const max = parseMoneyToCents(str(fd, "maxAmount") || "0");
  const expiry = Number(onlyDigits(str(fd, "defaultExpiryMin")));

  if (!Number.isFinite(fee) || fee < 0 || fee > 100) return { error: "Taxa % inválida" };
  if (!Number.isFinite(gw) || gw < 0 || gw > 100) return { error: "Taxa da Pagar.me inválida" };
  if (![fixed, min, max, withdrawFee].every((n) => Number.isFinite(n) && n >= 0)) return { error: "Valores em reais inválidos" };
  if (min < 100) return { error: "O valor mínimo não pode ser menor que R$ 1,00" };
  if (![15, 30, 60, 1440].includes(expiry)) return { error: "Expiração padrão inválida" };

  await Promise.all([
    setSetting("fee_percent", fee.toFixed(2)),
    setSetting("gateway_fee_percent", gw.toFixed(2)),
    setSetting("withdraw_fee_cents", String(withdrawFee)),
    setSetting("fee_fixed_cents", String(fixed)),
    setSetting("min_amount_cents", String(min)),
    setSetting("max_amount_cents", String(max)),
    setSetting("default_expiry_min", String(expiry)),
  ]);
  revalidatePath("/admin/configuracoes/taxas");
  return { ok: "Taxas salvas. Valem para cobranças novas." };
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (!(await bcrypt.compare(current, admin.passwordHash))) return { error: "Senha atual incorreta" };
  if (next.length < 10) return { error: "A nova senha precisa de ao menos 10 caracteres" };
  if (next !== confirm) return { error: "As senhas não conferem" };
  await db.admin.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { ok: "Senha alterada" };
}
