import { redirect } from "next/navigation";
import { ChargeForm } from "@/components/charge-form";
import { getClientId } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getEffectiveGateway } from "@/lib/gateway";

export default async function GerarPage() {
  const clientId = await getClientId();
  if (!clientId) redirect("/");
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const [s, gateway] = await Promise.all([getSettings(["default_expiry_min", "min_amount_cents"]), getEffectiveGateway()]);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Gerar Pix</h1>
        <p className="text-[13px] text-muted-foreground">Informe o valor. O resto já está preenchido.</p>
      </div>
      <ChargeForm
        defaultPayer={{ name: client.payerName ?? "", cpf: client.payerCpf ?? "", email: client.payerEmail ?? "", phone: client.payerPhone ?? "" }}
        defaultExpiryMin={client.defaultExpiryMin ?? Number(s.default_expiry_min)}
        minAmountCents={client.minAmountCents ?? Number(s.min_amount_cents)}
        allowExpiry={gateway !== "legacy"}
      />
    </div>
  );
}
