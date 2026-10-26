# JPix — Gerador de Pix com Pagar.me

Especificação de produto, identidade visual e arquitetura. Documento de partida para o build.

> **Uma decisão de projeto registrada aqui:** o pedido original previa uma *pool* de nomes e CPFs de terceiros rotacionando aleatoriamente como pagador, com e-mails e telefones inventados para satisfazer os campos obrigatórios da Pagar.me. Isso não entra no projeto: enviar CPF de outra pessoa como pagador de uma cobrança é uso indevido de identidade e viola os termos da Pagar.me (que pode bloquear a conta e reter saldo). O que fica, e atende o mesmo fluxo de uso ("já vem preenchido, só digita o valor"), é: **cada código de cliente tem seus próprios dados de pagador cadastrados uma vez**, que vêm preenchidos por padrão e podem ser editados por cobrança com um botão. O resto do produto está intacto.

---

## 1. Visão geral

| Item | Definição |
|---|---|
| Nome de trabalho | **JPix** |
| O que é | Página web (mobile-first e desktop) onde um cliente autenticado por **código** gera cobranças Pix via Pagar.me, acompanha status, expiração e histórico. |
| Quem opera | Você, via `/admin` (e-mail + senha): cadastra clientes, configura API/webhook da Pagar.me, define a % cobrada e acompanha o financeiro. |
| Modelo de negócio | O pagador paga o Pix → o dinheiro entra na conta Pagar.me → o sistema registra a **taxa %** por cliente → você **repassa** o líquido ao cliente e registra o repasse. |

### Fluxo principal

```
[Cliente abre o site] → digita código (ex: 2426) → entra direto no painel dele
      │
      ▼
[Nova cobrança] valor (obrigatório) + descrição (opcional)
      │  nome / CPF / e-mail / telefone já preenchidos com os dados do cliente
      │  botão "Editar dados do pagador" libera os campos
      ▼
[POST Pagar.me /core/v5/orders] payment_method: pix
      │
      ▼
[Tela do Pix] QR Code + copia-e-cola + contagem regressiva até expirar
      │
      ▼
[Webhook order.paid] → status PAGO → aparece no histórico e no financeiro
```

---

## 2. Identidade visual (reverse engineering do Sharpify)

Os tokens abaixo foram extraídos do CSS público de `sharpify.com.br` (tema shadcn/ui com variáveis em RGB) e conferidos contra as duas capturas (tema claro e escuro). Usamos os **tokens**, não os assets (logo, nome, ilustrações).

### 2.1 Stack visual observada

- **Framework:** Next.js (App Router) + Tailwind + componentes estilo shadcn/ui.
- **Fontes:** `Inter` (UI do painel), `JetBrains Mono` (números, códigos, copia-e-cola), `Outfit` (landing/títulos de marketing).
- **Raio:** `--radius: 1rem` no painel (cards bem arredondados), `0.75rem` nos componentes menores.
- **Layout:** sidebar fixa à esquerda (≈ 200 px) com grupos em caixa-alta pequena (`MENU`, `PAGAMENTOS`), topbar com badge de plano, toggle de tema, sino de notificações com contador, avatar + nome + papel (`DONO`).
- **Cards:** fundo `card`, borda 1 px `border`, padding ≈ 24 px, título 14 px semibold + subtítulo 12 px `muted-foreground`, valor grande 28–32 px bold.
- **Card destaque (Saldo):** gradiente azul `linear-gradient(135deg, #1b4fa0 → #2e7cd5)` com texto branco e ícone circular translúcido no canto.
- **Badges de variação:** pílula pequena com seta ↗ e % em verde (`#2ecc71` sobre fundo verde 10 %), ou cinza `— 0%` quando neutro.
- **Gráficos:** linhas finas com área preenchida em azul translúcido; barras com hachura diagonal; legenda abaixo com traço colorido.

### 2.2 Tokens de cor (copiar para `globals.css`)

```css
:root {
  --background: 249 249 249;
  --foreground: 17 34 63;
  --card: 255 255 255;
  --card-foreground: 17 34 63;
  --popover: 255 255 255;
  --popover-foreground: 17 34 63;
  --primary: 46 124 213;          /* #2E7CD5 */
  --primary-foreground: 249 249 249;
  --secondary: 242 246 250;
  --secondary-foreground: 17 34 63;
  --muted: 242 246 250;
  --muted-foreground: 95 112 132;
  --accent: 234 243 253;
  --accent-foreground: 17 34 63;
  --destructive: 255 72 72;
  --destructive-foreground: 250 250 250;
  --border: 220 228 236;
  --input: 220 228 236;
  --ring: 0 132 255;
  --radius: 1rem;
  --chart-1: 46 124 213;
  --chart-2: 132 177 238;
  --chart-3: 18 116 174;
  --chart-4: 0 132 255;
  --chart-5: 18 50 69;
}

.dark {
  --background: 11 11 12;
  --foreground: 250 250 250;
  --card: 15 15 16;
  --card-foreground: 250 250 250;
  --popover: 11 11 12;
  --popover-foreground: 250 250 250;
  --primary: 41 120 255;          /* #2978FF */
  --primary-foreground: 255 255 255;
  --secondary: 15 15 16;
  --secondary-foreground: 250 250 250;
  --muted: 26 26 28;
  --muted-foreground: 164 164 164;
  --accent: 38 38 43;
  --accent-foreground: 250 250 250;
  --destructive: 255 61 61;
  --destructive-foreground: 250 250 250;
  --border: 30 30 30;
  --input: 15 15 16;
  --ring: 214 214 214;
  --chart-1: 51 77 255;
  --chart-2: 255 51 136;
  --chart-3: 222 178 51;
  --chart-4: 204 102 255;
  --chart-5: 73 183 92;
}
```

### 2.3 Cores semânticas de status (JPix)

| Status | Cor | Uso |
|---|---|---|
| Pendente | `#F5A524` (âmbar) | badge, borda do card do Pix, barra de tempo |
| Pago | `#2ECC71` (verde) | badge, ícone ✓, linha no gráfico |
| Expirado | `#8A94A6` (cinza) | badge apagado, card com opacidade 0.6 |
| Cancelado / Falha | `#FF4848` (destructive) | badge, toast |
| Repassado (admin) | `#2E7CD5` (primary) | badge no financeiro |

### 2.4 Tipografia

| Papel | Fonte | Tamanho / peso |
|---|---|---|
| Título de página | Inter | 22 px / 600 |
| Subtítulo | Inter | 13 px / 400, `muted-foreground` |
| Título de card | Inter | 14 px / 600 |
| Valor destaque | Inter | 30 px / 700, `tabular-nums` |
| Códigos, CPF, copia-e-cola | JetBrains Mono | 13 px / 500 |
| Labels de grupo na sidebar | Inter | 11 px / 600, `letter-spacing 0.08em`, caixa-alta |

---

## 3. Telas

### 3.1 `/` — Login por código

- Card centralizado, logo em cima, campo único "Código de acesso" (numérico, 4–8 dígitos, teclado numérico no mobile).
- Botão `Entrar`. Erro inline: "Código inválido ou desativado".
- Ao validar: cria sessão (cookie httpOnly, JWT com `client_id`), redireciona para `/app`.
- Rate limit: 5 tentativas / minuto por IP.

### 3.2 `/app` — Painel do cliente

Layout: no desktop, sidebar + conteúdo. No mobile, bottom tab bar com 3 abas: **Gerar**, **Histórico**, **Resumo**.

**Cards de topo (igual ao Sharpify)**

| Card | Conteúdo |
|---|---|
| Recebido no período (gradiente azul) | soma de cobranças pagas (valor bruto) |
| Líquido a receber | bruto − taxa %, com badge da % aplicada |
| Cobranças | total / pagas / pendentes / expiradas |

**Formulário "Gerar Pix"**

| Campo | Regras |
|---|---|
| Valor | obrigatório, máscara `R$ 1.234,56`, mínimo R$ 1,00 (configurável no admin), enviado em centavos |
| Descrição | opcional, máx. 100 caracteres, vira `items[0].description` |
| Pagador | bloco colapsado mostrando nome e CPF mascarado (`***.456.789-**`). Botão **"Editar dados do pagador"** expande nome, CPF (máscara `000.000.000-00` + validação de dígitos), e-mail, telefone (`(00) 00000-0000`) |
| Expiração | select: 15 min / 30 min / 1 h / 24 h (padrão vem do admin) |

Botão `Gerar Pix` → tela do Pix:

- QR Code grande (gerado localmente a partir do `qr_code` copia-e-cola, lib `qrcode`).
- Campo copia-e-cola em JetBrains Mono com botão `Copiar` (feedback "Copiado!").
- Contagem regressiva `mm:ss` + barra de progresso que muda de azul → âmbar (< 25 %) → cinza (expirado).
- Valor e descrição.
- Status ao vivo via polling a cada 5 s (ou SSE): ao virar **PAGO**, card fica verde com ✓ e som curto opcional.
- Botões: `Nova cobrança`, `Compartilhar` (Web Share API no mobile: envia copia-e-cola).

**Histórico**

- Tabela (desktop) / lista de cards (mobile) com: data, valor, descrição, pagador, status (badge colorido), tempo restante (para pendentes), ação `Ver Pix`.
- Filtros: status, período (date range igual ao do Sharpify), busca por descrição.
- Paginação 20 por página.

**Resumo**

- Gráfico de linha "Recebido por dia" + barras "Pagas × Expiradas" (Recharts, cores `chart-1..5`).
- Ticket médio, taxa de conversão (pagas / geradas).

### 3.3 `/admin` — Painel administrativo

Login com e-mail + senha (bcrypt, sessão separada da do cliente, cookie distinto). 2FA por TOTP opcional na fase 2.

**Sidebar do admin**

```
MENU
  Visão geral
  Clientes
  Cobranças
FINANCEIRO
  Resumo
  Repasses
CONFIGURAÇÕES
  Pagar.me
  Webhook
  Taxas
  Segurança
```

**Visão geral** — cards: volume bruto do período, sua receita (soma das taxas), a repassar, cobranças pendentes agora. Gráfico de volume por dia e top 5 clientes.

**Clientes**

| Campo | Observação |
|---|---|
| Nome / apelido | exibido no painel do cliente |
| Código de acesso | 4–8 dígitos, único, gerado ou digitado; botão "Regerar" |
| Dados do pagador padrão | nome, CPF, e-mail, telefone (os que vêm preenchidos no formulário) |
| Taxa % | sobrescreve a taxa global; ex. 5,00 % |
| Taxa fixa | opcional, ex. R$ 0,50 por cobrança |
| Expiração padrão | minutos |
| Valor mínimo / máximo | |
| Chave Pix de repasse | para você saber para onde repassar |
| Status | ativo / suspenso |
| Ações | ver cobranças, ver financeiro do cliente, desativar |

**Cobranças** — todas as cobranças de todos os clientes, com filtros por cliente/status/período, link para o pedido na Pagar.me, botão "Reconsultar status" (GET no order) e "Cancelar" (para pendentes).

**Financeiro › Resumo**

| Métrica | Cálculo |
|---|---|
| Bruto pago | Σ `amount` das cobranças `paid` |
| Taxa Pagar.me | Σ custo informado pelo gateway (ou estimativa configurada, ex. 1,19 %) |
| Sua receita | Σ (`amount` × taxa % do cliente + taxa fixa) |
| Líquido do cliente | bruto − sua receita |
| Já repassado | Σ repasses registrados |
| **Falta repassar** | líquido do cliente − já repassado |

Tabela por cliente com todas as colunas acima, totalizador no rodapé, exportação CSV.

**Financeiro › Repasses** — registrar um repasse manual (cliente, valor, data, comprovante opcional, observação). O saldo "falta repassar" do cliente é abatido. Histórico de repasses.

**Configurações › Pagar.me**

- Secret key (`sk_test_…` / `sk_live_…`) — armazenada cifrada (AES-256-GCM com chave em env), exibida mascarada.
- Ambiente: teste / produção.
- Botão **"Testar conexão"** (GET `/core/v5/customers?size=1`).

**Configurações › Webhook**

- URL pública do endpoint exibida para copiar: `https://seu-dominio/api/webhooks/pagarme`.
- Usuário e senha de Basic Auth que você cadastra no painel da Pagar.me (o sistema valida o header `Authorization`).
- Lista dos últimos 50 eventos recebidos com status (processado / ignorado / erro) e botão "Reprocessar".
- Botão "Simular evento" em modo teste.

**Configurações › Taxas** — taxa % global, taxa fixa global, taxa estimada da Pagar.me (para o cálculo de custo), valor mínimo global, expiração padrão.

**Configurações › Segurança** — trocar senha, listar sessões, ativar 2FA.

---

## 4. Integração Pagar.me (API v5)

Base: `https://api.pagar.me/core/v5` · Auth: `Authorization: Basic base64("sk_xxx:")`.

### 4.1 Criar cobrança Pix

`POST /orders`

```json
{
  "closed": true,
  "customer": {
    "name": "Nome do Cliente",
    "email": "cliente@exemplo.com",
    "type": "individual",
    "document": "12345678909",
    "document_type": "CPF",
    "phones": {
      "mobile_phone": { "country_code": "55", "area_code": "11", "number": "999999999" }
    }
  },
  "items": [
    { "amount": 1500, "description": "Descrição digitada ou 'Pagamento'", "quantity": 1, "code": "jpix" }
  ],
  "payments": [
    { "payment_method": "pix", "pix": { "expires_in": 1800 } }
  ],
  "metadata": { "jpix_client_id": "…", "jpix_charge_id": "…" }
}
```

Da resposta usamos: `id` (order), `charges[0].id`, `charges[0].last_transaction.qr_code` (copia-e-cola), `qr_code_url` (PNG), `expires_at`, `status`.

### 4.2 Consultar

`GET /orders/{order_id}` — usado pelo botão "Reconsultar" e por um job de reconciliação a cada 2 min para pendentes com webhook atrasado.

### 4.3 Webhook

Endpoint: `POST /api/webhooks/pagarme`

| Evento | Ação |
|---|---|
| `order.paid` / `charge.paid` | marca `paid`, grava `paid_at`, calcula taxas, notifica cliente (SSE) |
| `order.payment_failed` / `charge.payment_failed` | marca `failed` |
| `order.canceled` / `charge.refunded` | marca `canceled` / `refunded` |

Regras: validar Basic Auth, responder 200 rápido, processar de forma idempotente por `event.id` (tabela `webhook_events` com unique). Expiração é detectada localmente: `expires_at < now()` e status ainda `pending` → `expired` (job a cada minuto).

### 4.4 Estados

```
pending ──(paid)──▶ paid ──(refund)──▶ refunded
   │
   ├──(expires_at passou)──▶ expired
   └──(cancel / failed)────▶ canceled | failed
```

---

## 5. Arquitetura

| Camada | Escolha | Por quê |
|---|---|---|
| App | **Next.js 15** (App Router, TypeScript) | mesma base visual do Sharpify, SSR + API routes no mesmo deploy |
| UI | Tailwind + shadcn/ui + lucide-react + Recharts | tokens já extraídos encaixam direto |
| Banco | **PostgreSQL** + Prisma | relacional simples, transações para financeiro |
| Jobs | cron do host (Vercel Cron / Railway cron) ou `node-cron` em container | expiração e reconciliação |
| Tempo real | SSE em `/api/charges/{id}/events` | mais simples que WebSocket, cai bem no mobile |
| Sessões | JWT em cookie httpOnly, segredo em env | duas audiências: `client` e `admin` |
| Segredos | `PAGARME_KEY_ENCRYPTION_KEY`, `JWT_SECRET` em env; secret key da Pagar.me cifrada no banco | |
| Deploy | Vercel ou Railway + Postgres gerenciado (Neon / Supabase) | HTTPS obrigatório para webhook |

### 5.1 Estrutura de pastas

```
app/
  (public)/page.tsx            # login por código
  app/                         # painel do cliente
    layout.tsx  page.tsx  historico/  resumo/  pix/[id]/
  admin/
    login/  page.tsx  clientes/  cobrancas/  financeiro/  configuracoes/
  api/
    auth/code  auth/admin
    charges/  charges/[id]/events
    webhooks/pagarme
    admin/…
components/ui/                 # shadcn
components/charts/
lib/
  pagarme.ts  masks.ts (CPF, BRL, telefone)  fees.ts  crypto.ts  auth.ts
prisma/schema.prisma
```

### 5.2 Modelo de dados

```prisma
model Admin {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  totpSecret   String?
  createdAt    DateTime @default(now())
}

model Client {
  id             String   @id @default(cuid())
  name           String
  accessCode     String   @unique
  active         Boolean  @default(true)
  feePercent     Decimal? @db.Decimal(5,2)   // null = usa global
  feeFixedCents  Int?
  defaultExpiryMin Int?
  minAmountCents Int?
  maxAmountCents Int?
  payoutPixKey   String?
  payerName      String
  payerCpf       String
  payerEmail     String
  payerPhone     String
  charges        Charge[]
  payouts        Payout[]
  createdAt      DateTime @default(now())
}

model Charge {
  id              String   @id @default(cuid())
  clientId        String
  client          Client   @relation(fields: [clientId], references: [id])
  amountCents     Int
  description     String?
  payerName       String
  payerCpf        String
  payerEmail      String
  payerPhone      String
  status          ChargeStatus @default(pending)
  pagarmeOrderId  String?  @unique
  pagarmeChargeId String?
  qrCode          String?  // copia e cola
  qrCodeUrl       String?
  expiresAt       DateTime
  paidAt          DateTime?
  feePercent      Decimal  @db.Decimal(5,2)  // congelada no momento da criação
  feeFixedCents   Int      @default(0)
  ourFeeCents     Int      @default(0)       // calculado ao pagar
  gatewayFeeCents Int?                       // informado pelo gateway ou estimado
  createdAt       DateTime @default(now())
  @@index([clientId, status, createdAt])
}

enum ChargeStatus { pending paid expired canceled failed refunded }

model Payout {
  id          String   @id @default(cuid())
  clientId    String
  client      Client   @relation(fields: [clientId], references: [id])
  amountCents Int
  paidAt      DateTime
  note        String?
  receiptUrl  String?
  createdAt   DateTime @default(now())
}

model WebhookEvent {
  id          String   @id            // event id da Pagar.me
  type        String
  payload     Json
  processed   Boolean  @default(false)
  error       String?
  receivedAt  DateTime @default(now())
}

model Setting {
  key   String @id   // pagarme_secret_enc, pagarme_env, webhook_user, webhook_pass_hash, fee_percent, fee_fixed, gateway_fee_percent, min_amount, default_expiry
  value String
}
```

### 5.3 Cálculo de taxas (em `lib/fees.ts`)

```
ourFee      = round(amount × feePercent / 100) + feeFixed
gatewayFee  = informado pelo gateway, senão round(amount × gatewayFeePercent / 100)
clientNet   = amount − ourFee            // o que o cliente tem a receber
yourProfit  = ourFee − gatewayFee        // o que sobra para você
```

Percentual e fixo são **congelados na cobrança** no momento da criação, então mudar a taxa no admin não altera cobranças antigas.

---

## 6. Segurança e operação

- HTTPS em tudo; cookies `Secure`, `HttpOnly`, `SameSite=Lax`.
- Código de acesso: comparação em tempo constante, rate limit por IP e bloqueio de 15 min após 10 falhas.
- Admin: senha com bcrypt (custo 12), rate limit, log de login.
- Secret key da Pagar.me nunca vai ao browser; só o servidor fala com a API.
- Webhook: Basic Auth obrigatório, idempotência por `event.id`, log completo do payload.
- CPF do pagador sempre mascarado na UI do cliente e nos logs.
- Backups diários do Postgres.
- Modo teste com `sk_test_` para validar o fluxo inteiro antes de ir para produção.

---

## 7. Fases de entrega

| Fase | Entrega | Critério de pronto |
|---|---|---|
| 0 | Projeto Next + Tailwind + tokens + layout (sidebar, topbar, cards) | telas estáticas idênticas ao estilo do Sharpify, claro e escuro |
| 1 | Login por código, formulário, criação do Pix na Pagar.me (sandbox), tela do QR com countdown | gerar e pagar um Pix de teste de ponta a ponta |
| 2 | Webhook + job de expiração + SSE + histórico com filtros | status muda sozinho na tela |
| 3 | `/admin`: login, clientes, cobranças, configurações Pagar.me/webhook/taxas | você cadastra um cliente e ele consegue usar |
| 4 | Financeiro: resumo, repasses, CSV, gráficos | "falta repassar" bate com a conta manual |
| 5 | Polimento mobile, PWA (ícone na home), 2FA no admin, testes e2e (Playwright) | pronto para produção com `sk_live_` |

---

## 8. Perguntas em aberto

1. Vai existir mais de um admin ou só você?
2. O repasse é manual (você faz o Pix e registra) ou quer, na fase 2, repasse automático via **split de pagamento** da Pagar.me (recipients)? O split resolve o "falta repassar" na origem.
3. Quer que o cliente veja a % cobrada dele ou só o líquido?
4. Precisa de notificação (Telegram / e-mail) quando um Pix for pago?
