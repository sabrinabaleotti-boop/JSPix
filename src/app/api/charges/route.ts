import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientId } from "@/lib/auth";
import { isValidCpf, onlyDigits } from "@/lib/masks";
import { getSettings } from "@/lib/settings";
import { PagarmeError } from "@/lib/pagarme";
import { LegacyError } from "@/lib/legacy";
import { createPix, GatewayInputError } from "@/lib/gateway";
import { payerIpv4, publicBaseUrl } from "@/lib/request-info";
import { serializeCharge } from "@/lib/charges";
import { resolveSplit } from "@/lib/split";
import { getNextTestPayerForClient } from "@/lib/test-pool-rotation";

import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  // Em paralelo: o banco fica longe do servidor e cada consulta em sequência soma uma viagem.
  const [client, settings, body] = await Promise.all([
    db.client.findUnique({ where: { id: clientId } }),
    getSettings(["fee_percent", "fee_fixed_cents", "default_expiry_min", "min_amount_cents", "max_amount_cents", "gateway"]),
    req.json().catch(() => ({})),
  ]);
  if (!client || !client.active) return NextResponse.json({ error: "Cliente inativo" }, { status: 403 });

  const amountCents = Math.round(Number(body.amountCents));
  const description = String(body.description ?? "").trim().slice(0, 100);
  const expiresInMin = Number(body.expiresInMin) || 0;
  const minAmount = client.minAmountCents ?? Number(settings.min_amount_cents);
  const maxAmount = client.maxAmountCents ?? Number(settings.max_amount_cents);

  if (!Number.isFinite(amountCents) || amountCents < minAmount) {
    return NextResponse.json({ error: `Valor mínimo é ${(minAmount / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` }, { status: 400 });
  }
  if (maxAmount > 0 && amountCents > maxAmount) {
    return NextResponse.json({ error: `Valor máximo é ${(maxAmount / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` }, { status: 400 });
  }

  // Se não tiver dados do pagador, usa a pool de teste (se gateway é simulated/teste)
  let payer;

  if (!body.payer && (!client.payerName || !client.payerCpf)) {
    // Só usa pool de teste se o gateway for "simulated" (não estiver configurado para produção)
    if (settings.gateway === "simulated") {
      const testPayer = await getNextTestPayerForClient(clientId);
      payer = {
        name: testPayer.nome,
        cpf: testPayer.cpf.replace(/\D/g, ""),
        email: testPayer.email,
        phone: testPayer.phone,
      };
    } else {
      return NextResponse.json({ error: "Forneça os dados do pagador (nome, CPF, e-mail, telefone) ou cadastre-os nas configurações" }, { status: 400 });
    }
  } else {
    payer = {
      name: String(body.payer?.name ?? client.payerName).trim(),
      cpf: onlyDigits(String(body.payer?.cpf ?? client.payerCpf)),
      email: String(body.payer?.email ?? client.payerEmail).trim().toLowerCase(),
      phone: onlyDigits(String(body.payer?.phone ?? client.payerPhone)),
    };
  }

  if (payer.name.length < 3) return NextResponse.json({ error: "Nome do pagador inválido" }, { status: 400 });
  if (!isValidCpf(payer.cpf)) return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payer.email)) return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  if (payer.phone.length < 10 || payer.phone.length > 11) return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });


  const allowedExpiry = [15, 30, 60, 1440];
  const expiry = allowedExpiry.includes(expiresInMin) ? expiresInMin : client.defaultExpiryMin ?? Number(settings.default_expiry_min);
  const feePercent = client.feePercent !== null ? Number(client.feePercent) : Number(settings.fee_percent);
  const feeFixedCents = client.feeFixedCents ?? Number(settings.fee_fixed_cents);

  const [charge, split, payerIp, baseUrl] = await Promise.all([
    db.charge.create({
      data: {
        clientId,
        amountCents,
        description: description || null,
        payerName: payer.name,
        payerCpf: payer.cpf,
        payerEmail: payer.email,
        payerPhone: payer.phone,
        expiresAt: new Date(Date.now() + expiry * 60 * 1000),
        feePercent,
        feeFixedCents,
      },
    }),
    resolveSplit(client.splitConfig),
    payerIpv4(),
    publicBaseUrl(),
  ]);

  try {
    const address =
      client.payerStreet && client.payerNumber && client.payerZip && client.payerCity && client.payerState
        ? {
            street: client.payerStreet,
            number: client.payerNumber,
            zipCode: client.payerZip,
            city: client.payerCity,
            state: client.payerState,
            ...(client.payerComplement ? { complement: client.payerComplement } : {}),
            ...(client.payerNeighborhood ? { neighborhood: client.payerNeighborhood } : {}),
          }
        : null;
    const result = await createPix({
      chargeId: charge.id,
      clientId,
      amountCents,
      description,
      expiresInSeconds: expiry * 60,
      payer: { ...payer, address },
      payerIp,
      baseUrl,
      split,
    });
    const updated = await db.charge.update({
      where: { id: charge.id },
      data: {
        gateway: result.gateway,
        gatewayId: result.gatewayId,
        gatewayChargeId: result.gatewayChargeId,
        qrCode: result.qrCode,
        qrCodeUrl: result.qrCodeUrl,
        expiresAt: result.expiresAt,
        splitRules: result.splitRules ?? Prisma.DbNull,
      },
    });
    return NextResponse.json(serializeCharge(updated), { status: 201 });
  } catch (e) {
    await db.charge.update({ where: { id: charge.id }, data: { status: "failed" } });
    const msg =
      e instanceof PagarmeError || e instanceof LegacyError || e instanceof GatewayInputError ? e.message : "Falha ao criar o Pix";
    console.error("createPixOrder failed", e);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function GET(req: Request) {
  const clientId = await getClientId();
  if (!clientId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const take = 20;
  const where = { clientId, ...(status ? { status: status as never } : {}) };
  const [items, total] = await Promise.all([
    db.charge.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }),
    db.charge.count({ where }),
  ]);
  return NextResponse.json({ items: items.map(serializeCharge), total, page, pages: Math.ceil(total / take) });
}
