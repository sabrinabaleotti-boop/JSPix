import { getSettings } from "@/lib/settings";
import { centsToInput, percentToInput } from "@/lib/money";

export async function clientFormDefaults() {
  const s = await getSettings(["fee_percent", "min_amount_cents", "default_expiry_min"]);
  return {
    feePercent: percentToInput(s.fee_percent),
    minAmount: centsToInput(Number(s.min_amount_cents)),
    expiry: s.default_expiry_min,
  };
}
