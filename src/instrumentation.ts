/** Roda uma vez quando o servidor sobe. Datas são formatadas no horário de Brasília mesmo com o servidor nos EUA. */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && !process.env.TZ) {
    process.env.TZ = "America/Sao_Paulo";
  }
}
