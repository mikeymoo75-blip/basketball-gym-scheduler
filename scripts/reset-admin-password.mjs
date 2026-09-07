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

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No account found for ${email}.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email },
    data: {
      passwordHash: bcrypt.hashSync(password, 10),
      mustChangePassword: true,
      active: true,
    },
  });

  console.log(`Password reset for ${email}. Sign in with ADMIN_PASSWORD from .env, then choose a new password.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
