import { isKnownBank } from "@/lib/banks";
import { isValidCnpj, isValidCpf, onlyDigits } from "@/lib/masks";
import { parseMoneyToCents } from "@/lib/money";

// Monta o corpo de POST /recipients (docs.pagar.me/reference/criar-recebedor-1, contrato KYC de fev/2024)
// a partir do formulário do admin. Valores em dinheiro vão em centavos, como no resto da API v5.

export const MAX_PARTNERS = 5;

export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

type Fd = { get(k: string): FormDataEntryValue | null };

class InputError extends Error {}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function reader(fd: Fd) {
  const get = (k: string) => String(fd.get(k) ?? "").trim();
  const req = (k: string, label: string) => {
    const v = get(k);
    if (!v) throw new InputError(`Preencha: ${label}`);
    return v;
  };
  return { get, req };
}

/** "2026-10-25" (input date) -> "25/10/2026", formato dos exemplos da Pagar.me para birthdate. */
function toBrDate(iso: string, label: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new InputError(`Data inválida: ${label}`);
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function money(v: string, label: string) {
  const c = parseMoneyToCents(v);
  if (!Number.isFinite(c) || c <= 0) throw new InputError(`Valor inválido: ${label}`);
  return c;
}

function email(v: string, label: string) {
  if (!EMAIL_RE.test(v)) throw new InputError(`E-mail inválido: ${label}`);
  return v.toLowerCase();
}

function cpf(v: string, label: string) {
  if (!isValidCpf(v)) throw new InputError(`CPF inválido: ${label}`);
  return onlyDigits(v);
}

function phone(v: string, label: string) {
  const d = onlyDigits(v);
  if (d.length < 10 || d.length > 11) throw new InputError(`Telefone inválido (com DDD): ${label}`);
  return [{ ddd: d.slice(0, 2), number: d.slice(2), type: "mobile" }];
}

function address(r: ReturnType<typeof reader>, p: string, label: string) {
  const zip = onlyDigits(r.req(`${p}zip_code`, `CEP (${label})`));
  if (zip.length !== 8) throw new InputError(`CEP inválido (${label})`);
  const state = r.req(`${p}state`, `UF (${label})`).toUpperCase();
  if (!UFS.includes(state)) throw new InputError(`UF inválida (${label})`);
  // A Pagar.me recusa o cadastro sem complementary e reference_point, mesmo vazios na vida real.
  return {
    street: r.req(`${p}street`, `Rua (${label})`),
    street_number: r.req(`${p}street_number`, `Número (${label})`),
    complementary: r.req(`${p}complementary`, `Complemento (${label})`),
    neighborhood: r.req(`${p}neighborhood`, `Bairro (${label})`),
    city: r.req(`${p}city`, `Cidade (${label})`),
    state,
    zip_code: zip,
    reference_point: r.req(`${p}reference_point`, `Ponto de referência (${label})`),
  };
}

function registerIndividual(r: ReturnType<typeof reader>) {
  const mother = r.get("mother_name");
  return {
    type: "individual",
    name: r.req("name", "Nome completo"),
    email: email(r.req("email", "E-mail"), "E-mail"),
    document: cpf(r.req("document", "CPF"), "CPF do recebedor"),
    ...(mother ? { mother_name: mother } : {}),
    birthdate: toBrDate(r.req("birthdate", "Data de nascimento"), "Data de nascimento"),
    monthly_income: money(r.req("monthly_income", "Renda mensal"), "Renda mensal"),
    professional_occupation: r.req("professional_occupation", "Profissão"),
    phone_numbers: phone(r.req("phone", "Telefone"), "Telefone"),
    address: address(r, "addr_", "endereço do recebedor"),
  };
}

function partner(r: ReturnType<typeof reader>, i: number) {
  const p = `p${i}_`;
  const label = `sócio ${i + 1}`;
  const mother = r.get(`${p}mother_name`);
  if (r.get(`${p}legal_rep`) !== "on") throw new InputError(`Confirme que o ${label} é representante legal da empresa`);
  return {
    type: "individual",
    name: r.req(`${p}name`, `Nome (${label})`),
    email: email(r.req(`${p}email`, `E-mail (${label})`), label),
    document: cpf(r.req(`${p}document`, `CPF (${label})`), label),
    ...(mother ? { mother_name: mother } : {}),
    birthdate: toBrDate(r.req(`${p}birthdate`, `Nascimento (${label})`), `Nascimento (${label})`),
    monthly_income: money(r.req(`${p}monthly_income`, `Renda mensal (${label})`), `Renda mensal (${label})`),
    professional_occupation: r.req(`${p}professional_occupation`, `Profissão (${label})`),
    self_declared_legal_representative: true,
    phone_numbers: phone(r.req(`${p}phone`, `Telefone (${label})`), label),
    address: address(r, `${p}addr_`, label),
  };
}

function registerCorporation(r: ReturnType<typeof reader>) {
  const doc = r.req("document", "CNPJ");
  if (!isValidCnpj(doc)) throw new InputError("CNPJ inválido");
  const count = Math.min(MAX_PARTNERS, Math.max(1, Number(r.get("partner_count")) || 1));
  const founding = r.req("founding_date", "Data de fundação");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(founding)) throw new InputError("Data de fundação inválida");
  return {
    type: "corporation",
    email: email(r.req("email", "E-mail"), "E-mail da empresa"),
    document: onlyDigits(doc),
    // As descrições da doc v5 aparecem invertidas; segue o sentido dos nomes (e da v4): company_name = razão social, trading_name = nome fantasia.
    company_name: r.req("company_name", "Razão social"),
    trading_name: r.req("trading_name", "Nome fantasia"),
    annual_revenue: money(r.req("annual_revenue", "Faturamento anual"), "Faturamento anual"),
    corporation_type: r.req("corporation_type", "Tipo de empresa"),
    founding_date: founding,
    phone_numbers: phone(r.req("phone", "Telefone"), "Telefone da empresa"),
    main_address: address(r, "addr_", "endereço da empresa"),
    managing_partners: Array.from({ length: count }, (_, i) => partner(r, i)),
  };
}

function bankAccount(r: ReturnType<typeof reader>, type: "individual" | "corporation", document: string) {
  const bank = r.get("bank");
  if (!bank) throw new InputError("Escolha o banco na lista");
  if (!isKnownBank(bank)) throw new InputError("Banco não encontrado na lista do Banco Central");
  const account = onlyDigits(r.req("account_number", "Número da conta"));
  if (!account || account.length > 13) throw new InputError("Número da conta inválido (até 13 dígitos)");
  const accountType = r.get("account_type");
  if (accountType !== "checking" && accountType !== "savings") throw new InputError("Escolha o tipo de conta");
  const branchDigit = r.get("branch_check_digit");
  return {
    holder_name: r.req("holder_name", "Nome do titular"),
    holder_type: type === "individual" ? "individual" : "company",
    // A Pagar.me exige que o titular seja o próprio recebedor.
    holder_document: document,
    bank,
    branch_number: onlyDigits(r.req("branch_number", "Agência")),
    ...(branchDigit ? { branch_check_digit: branchDigit } : {}),
    account_number: account,
    account_check_digit: r.req("account_check_digit", "Dígito da conta"),
    type: accountType,
  };
}

function transferSettings(r: ReturnType<typeof reader>) {
  if (r.get("transfer_enabled") !== "on") return { transfer_enabled: false, transfer_interval: "Daily", transfer_day: 0 };
  const interval = r.get("transfer_interval");
  if (!["Daily", "Weekly", "Monthly"].includes(interval)) throw new InputError("Escolha a frequência das transferências");
  const day = interval === "Daily" ? 0 : Number(r.get("transfer_day"));
  if (interval === "Weekly" && !(day >= 1 && day <= 5)) throw new InputError("Dia da semana inválido para transferência");
  if (interval === "Monthly" && !(day >= 1 && day <= 31)) throw new InputError("Dia do mês inválido para transferência (1 a 31)");
  return { transfer_enabled: true, transfer_interval: interval, transfer_day: day };
}

function anticipationSettings(r: ReturnType<typeof reader>) {
  if (r.get("anticipation_enabled") !== "on") return undefined;
  const type = r.get("anticipation_type");
  if (type !== "full" && type !== "1025") throw new InputError("Escolha o tipo de antecipação");
  const volume = Number(r.get("anticipation_volume"));
  if (!(volume > 0 && volume <= 100)) throw new InputError("Volume de antecipação deve ser de 1 a 100%");
  const delay = r.get("anticipation_delay");
  return { enabled: true, type, volume_percentage: String(volume), ...(delay ? { delay } : {}) };
}

export type RecipientPayload = Record<string, unknown>;

export function buildRecipientPayload(fd: Fd): { payload: RecipientPayload } | { error: string } {
  const r = reader(fd);
  try {
    const type = r.get("type") === "corporation" ? "corporation" : "individual";
    const register = type === "individual" ? registerIndividual(r) : registerCorporation(r);
    const site = r.get("site_url");
    if (site && !/^https?:\/\//i.test(site)) throw new InputError("O site precisa começar com http:// ou https://");
    const code = r.get("code");
    const anticipation = anticipationSettings(r);
    return {
      payload: {
        ...(code ? { code } : {}),
        register_information: { ...register, ...(site ? { site_url: site } : {}) },
        default_bank_account: bankAccount(r, type, register.document),
        transfer_settings: transferSettings(r),
        ...(anticipation ? { automatic_anticipation_settings: anticipation } : {}),
      },
    };
  } catch (e) {
    if (e instanceof InputError) return { error: e.message };
    throw e;
  }
}
