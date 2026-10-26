# JPix

Gerador de cobranças Pix via Pagar.me ou Legacy Ecom, com acesso por código de cliente e painel administrativo. Especificação completa em [IDEIA.md](IDEIA.md).

## Stack

Next.js 16 · TypeScript · Tailwind 4 · Prisma 6 · PostgreSQL (Supabase) · Pagar.me API v5 · Legacy Ecom · Render

## Rodar localmente

1. Crie um projeto no [Supabase](https://supabase.com) e copie as duas connection strings em *Project Settings → Database* (pooler na porta 6543 para a app, 5432 para migrations).
2. Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

| Variável | O que é |
|---|---|
| `DATABASE_URL` | pooler Supabase, porta 6543, com `?pgbouncer=true` |
| `DIRECT_URL` | conexão direta Supabase, porta 5432 |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `SECRETS_ENCRYPTION_KEY` | `openssl rand -hex 32` (cifra a chave Pagar.me gravada pelo admin) |
| `PAGARME_SECRET_KEY` | `sk_test_…` do sandbox. Vazio = modo simulado (QR fake, botão "Simular pagamento") |

3. Instale, migre e rode:

```bash
npm install
```

```bash
npx prisma migrate dev --name init
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Acesse `http://localhost:3000` e entre com o código **2426** (cliente de demonstração criado pelo seed).

## Painel administrativo

Acesse `/admin` com e-mail e senha. Para criar ou redefinir a senha de um admin (roda contra o banco do `DATABASE_URL`):

```bash
npm run admin:create -- voce@exemplo.com "senha-com-10-ou-mais-caracteres"
```

No admin você cadastra clientes e gera os códigos de acesso, acompanha e cancela cobranças e configura a chave da Pagar.me, o webhook e as taxas.

## Gateways

O JPix tem duas gateways: Pagar.me e Legacy Ecom. A escolha fica em *Admin → Configurações → Gateway*. Cada cobrança guarda a gateway que a criou, então trocar a ativa não afeta as anteriores. Se a gateway escolhida não tiver credenciais, os Pix saem simulados.

Diferenças da Legacy:

- Só existem chaves de produção (`pk_live_`, `sk_live_`) e o KYC precisa estar aprovado.
- O endereço do pagador é obrigatório. Ele é cadastrado no cliente, no admin.
- A validade do Pix é definida pela Legacy. O seletor de validade some do formulário.
- Não há endpoint de cancelamento. Cancelar no admin só muda a cobrança no JPix.
- O webhook é enviado em cada cobrança, com um token secreto na URL. Ao receber um evento, o JPix reconsulta a Legacy antes de mudar o status. A assinatura `whsec_` é opcional.
- Repasses podem sair como Pix direto do saldo da Legacy, em *Financeiro → Repasses*.

## Split de pagamento

Em *Admin → Configurações → Split*, o JPix lista os recebedores da conta Pagar.me. Você escolhe a % de cada um, com o total fechando 100%. Com um recebedor só, ele fica com 100%. Um recebedor é marcado como responsável: paga as taxas, responde por chargeback e recebe os centavos que sobram.

Esse é o split padrão. No cadastro de cada cliente dá para usar o padrão, desligar o split ou definir um split próprio. Cada cobrança guarda as regras usadas.

O split só é enviado nas cobranças da Pagar.me, que exige porcentagens inteiras e informa que o recurso é para contas PSP. A documentação da Legacy não descreve o formato do split nem lista recebedores.

## Financeiro

*Admin → Financeiro* mostra, por cliente e período, o bruto pago, sua taxa, o custo da gateway, o lucro e o saldo a repassar. Repasses podem ser registrados (feitos por fora) ou enviados pela Legacy. Financeiro, repasses e cobranças exportam CSV no formato do Excel em português.

## Webhook da Pagar.me

Em *Admin → Configurações → Webhook*, gere as credenciais e cadastre na Pagar.me a URL, o usuário e a senha mostrados ali. Marque os eventos `order.paid`, `order.payment_failed`, `order.canceled`, `charge.paid`, `charge.payment_failed` e `charge.refunded`.

A senha do webhook e a chave da Pagar.me ficam cifradas com `SECRETS_ENCRYPTION_KEY`. Essa variável precisa ser a mesma no `.env` local e no Render.

## Deploy no Render

O arquivo `render.yaml` descreve o serviço. No Render: *New → Blueprint*, aponte para este repositório e preencha as variáveis de ambiente marcadas como `sync: false`. O build roda `prisma migrate deploy` automaticamente.

Depois do deploy, configure o webhook na Pagar.me apontando para `https://SEU-APP.onrender.com/api/webhooks/pagarme` (Fase 2).

## Scripts

| Script | Faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run db:migrate` | cria/aplica migration em dev |
| `npm run db:deploy` | aplica migrations em produção |
| `npm run db:seed` | cria configurações padrão e o cliente 2426 |
