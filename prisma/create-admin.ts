import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Uso: npm run admin:create -- email@exemplo.com "senha-forte"
const prisma = new PrismaClient();

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    console.error('Uso: npm run admin:create -- email@exemplo.com "senha com 8+ caracteres"');
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.admin.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash },
    create: { email: email.toLowerCase(), passwordHash },
  });
  console.log(`Admin pronto: ${admin.email}`);
}

main().finally(() => prisma.$disconnect());
