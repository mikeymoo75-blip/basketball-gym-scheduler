import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = (process.env.ADMIN_USERNAME || "admin").toLowerCase().trim();
const password = process.env.ADMIN_PASSWORD;

async function main() {
  if (!password) {
    console.error("Set ADMIN_PASSWORD in .env, then restart the app and run this script again.");
    process.exit(1);
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await prisma.user.create({
      data: {
        name: "Scheduler admin",
        email,
        passwordHash,
        role: "ADMIN",
        active: true,
        receivesMonopolyAlerts: true,
        mustChangePassword: false,
      },
    });
    console.log(`Created admin login: ${email}. Sign in with ADMIN_USERNAME / ADMIN_PASSWORD from .env.`);
    return;
  }

  await prisma.user.update({
    where: { email },
    data: {
      passwordHash,
      role: "ADMIN",
      mustChangePassword: false,
      active: true,
      receivesMonopolyAlerts: true,
    },
  });

  console.log(`Password reset for ${email}. Sign in with ADMIN_USERNAME / ADMIN_PASSWORD from .env.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
