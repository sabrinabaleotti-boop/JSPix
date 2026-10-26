import list from "@/lib/banks.json";

// Instituições com código de compensação, da lista do Banco Central (via brasilapi.com.br/api/banks/v1).
export type Bank = { code: string; name: string };

// Nomes curtos para os bancos mais usados, nesta ordem no topo do seletor.
// Array (não objeto): o JS reordenaria chaves numéricas como "104" antes de "001".
const POPULAR: [string, string][] = [
  ["001", "Banco do Brasil"],
  ["341", "Itaú Unibanco"],
  ["237", "Bradesco"],
  ["104", "Caixa Econômica Federal"],
  ["033", "Santander"],
  ["260", "Nubank"],
  ["077", "Inter"],
  ["336", "C6 Bank"],
  ["290", "PagBank (PagSeguro)"],
  ["323", "Mercado Pago"],
  ["380", "PicPay"],
  ["756", "Sicoob"],
  ["748", "Sicredi"],
  ["208", "BTG Pactual"],
  ["197", "Stone"],
  ["403", "Cora"],
  ["212", "Banco Original"],
  ["422", "Safra"],
  ["041", "Banrisul"],
  ["655", "Banco BV"],
  ["623", "Banco Pan"],
  ["536", "Neon"],
  ["364", "Efí (Gerencianet)"],
  ["461", "Asaas"],
  ["218", "Banco BS2"],
  ["004", "Banco do Nordeste"],
  ["070", "BRB - Banco de Brasília"],
];

const all = list as Bank[];
const popularCodes = new Set(POPULAR.map(([code]) => code));

export const BANKS: Bank[] = [...POPULAR.map(([code, name]) => ({ code, name })), ...all.filter((b) => !popularCodes.has(b.code))];

const CODES = new Set(all.map((b) => b.code));

export function isKnownBank(code: string) {
  return CODES.has(code);
}

export function bankLabel(code: string) {
  const b = BANKS.find((x) => x.code === code);
  return b ? `${b.code} - ${b.name}` : code;
}

export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
