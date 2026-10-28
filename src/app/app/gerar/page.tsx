import { redirect } from "next/navigation";
import { ChargeForm } from "@/components/charge-form";
import { PageHeader } from "@/components/admin/page-header";
import { getClientId } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getEffectiveGateway } from "@/lib/gateway";

export const metadata = { title: "Gerar Pix" };

export default async function GerarPage() {
  const clientId = await getClientId();
  if (!clientId) redirect("/");
  const client = await db.client.findUniqueOrThrow({ where: { id: clientId } });
  const [s, gateway] = await Promise.all([getSettings(["default_expiry_min", "min_amount_cents"]), getEffectiveGateway()]);

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <PageHeader eyebrow="Nova cobrança" title="Gerar Pix" description="Informe o valor. O QR Code fica pronto em segundos." />
      <div className="animate-fade-up [animation-delay:80ms]">
        <ChargeForm
          defaultExpiryMin={client.defaultExpiryMin ?? Number(s.default_expiry_min)}
          minAmountCents={client.minAmountCents ?? Number(s.min_amount_cents)}
          allowExpiry={gateway !== "legacy"}
        />
      </div>
    </div>
  );
}
