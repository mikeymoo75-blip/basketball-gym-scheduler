import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "admin").toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "MPtravel1!";

async function main() {
  if ((await prisma.user.count()) === 0) {
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    await prisma.user.create({
      data: {
        name: "Scheduler admin",
        email: ADMIN_USERNAME,
        passwordHash,
        role: "ADMIN",
        receivesMonopolyAlerts: true,
        mustChangePassword: true,
      },
    });
    console.log(`Created first admin login: ${ADMIN_USERNAME} (must change password on first sign-in)`);
  } else {
    console.log("Users already exist — skipping admin bootstrap.");
  }

  await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      monopolyWindowDays: 14,
      monopolyHoursThreshold: 10,
      monopolyShareThreshold: 0.35,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
