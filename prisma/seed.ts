import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.setting.upsert({ where: { key: "fee_percent" }, update: {}, create: { key: "fee_percent", value: "5.00" } });
  await prisma.setting.upsert({ where: { key: "fee_fixed_cents" }, update: {}, create: { key: "fee_fixed_cents", value: "0" } });
  await prisma.setting.upsert({ where: { key: "default_expiry_min" }, update: {}, create: { key: "default_expiry_min", value: "30" } });
  await prisma.setting.upsert({ where: { key: "min_amount_cents" }, update: {}, create: { key: "min_amount_cents", value: "100" } });

  await prisma.client.upsert({
    where: { accessCode: "2426" },
    update: {},
    create: {
      name: "Cliente Demo",
      accessCode: "2426",
      payerName: "Cliente Demo",
      payerCpf: "12345678909",
      payerEmail: "cliente.demo@example.com",
      payerPhone: "11999990000",
    },
  });
  console.log("Seed ok: cliente 2426 criado");
}

main().finally(() => prisma.$disconnect());
