# 🚀 Guia de Configuração JSPix no Render

## 1️⃣ Conectar Repositório GitHub

### Na tela do Render Dashboard:

1. Clique em **"Connect a repository"**
2. Selecione a conta GitHub `sabrinabaleotti-boop`
3. Procure por **`JSPix`**
4. Clique em **Connect**

---

## 2️⃣ Configurar Banco de Dados (Supabase)

Você precisa de um banco PostgreSQL. Recomendamos **Supabase** (gratuito):

### Passos:
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto ou use um existente
3. Vá em **Project Settings > Database > Connection Strings**
4. Copie:
   - **Transaction pooler (porta 6543)** → `DATABASE_URL`
   - **Session pooler (porta 5432)** → `DIRECT_URL`

### Exemplo de URL:
```
postgresql://postgres.xxxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

---

## 3️⃣ Gerar Secrets

Execute no seu terminal local:

```bash
# JWT_SECRET (para sessões)
openssl rand -hex 32

# SECRETS_ENCRYPTION_KEY (para cifrar dados no banco)
openssl rand -hex 32
```

Se estiver no Windows sem OpenSSL, use esta alternativa em PowerShell:
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RNGCryptoServiceProvider]::new().GetBytes(32))
```

---

## 4️⃣ Configurar Variáveis de Ambiente no Render

Na tela do Render, preencha as variáveis:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `DATABASE_URL` | `postgresql://...` | URL do banco (Transaction pooler) |
| `DIRECT_URL` | `postgresql://...` | URL do banco (Session pooler) |
| `JWT_SECRET` | `<gere com openssl>` | Segredo para JWT (gerado automaticamente) |
| `SECRETS_ENCRYPTION_KEY` | `<gere com openssl>` | Chave AES para cifrar segredos |
| `PAGARME_SECRET_KEY` | (deixe vazio para teste) | Chave secreta do Pagar.me |
| `PAGARME_ENV` | `test` | Ambiente de teste |
| `PUBLIC_URL` | `https://jspix.onrender.com` | URL pública da aplicação |
| `LEGACY_PUBLIC_KEY` | (deixe vazio se não usar) | Chave pública Legacy Ecom |
| `LEGACY_SECRET_KEY` | (deixe vazio se não usar) | Chave secreta Legacy Ecom |
| `LEGACY_WEBHOOK_SECRET` | (deixe vazio se não usar) | Segredo webhook Legacy |
| `VAPID_PUBLIC_KEY` | `<npx web-push generate-vapid-keys>` | Web Push: chave pública (aviso de Pix pago) |
| `VAPID_PRIVATE_KEY` | `<npx web-push generate-vapid-keys>` | Web Push: chave privada |
| `VAPID_SUBJECT` | `mailto:seu@email.com` | Contato exigido pelo protocolo Web Push |

---

## 5️⃣ Deploy

1. Na página de criação do serviço, clique em **"Deploy web service"**
2. Aguarde o build (pode levar alguns minutos)
3. Verifique os logs para erros
4. Acesse `https://jspix.onrender.com`

---

## 📋 Checklist Final

- [ ] Repositório GitHub conectado
- [ ] Banco de dados Supabase criado
- [ ] `DATABASE_URL` configurada
- [ ] `DIRECT_URL` configurada
- [ ] `JWT_SECRET` gerada
- [ ] `SECRETS_ENCRYPTION_KEY` gerada
- [ ] Deploy realizado com sucesso
- [ ] App acessível em `https://jspix.onrender.com`

---

## 🔧 Troubleshooting

### Build falha com "Migration failed"
- Verifique se `DIRECT_URL` está correta (deve usar porta 5432)
- Confirme credenciais do banco

### App inicia mas banco não conecta
- Verifique `DATABASE_URL` (deve usar porta 6543 para pooler)
- Confira se o IP do Render está na whitelist do banco

### "Cannot find module" errors
- Execute no Render: `npm ci && npm run build`

---

## 📞 Suporte

Para questões:
1. Verifique os **logs do Render** (Menu > Logs)
2. Teste a conexão do banco localmente com a mesma string
3. Confirme todas as variáveis foram preenchidas

