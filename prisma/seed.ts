import { PrismaClient, type Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.outboundEmail.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.blockedPeriod.deleteMany();
  await prisma.coachTeam.deleteMany();
  await prisma.team.deleteMany();
  await prisma.gym.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appSettings.deleteMany();

  const adminUsername = (process.env.ADMIN_USERNAME || "admin").toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "MPtravel1!";
  const passwordHash = await hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      name: "Scheduler admin",
      email: adminUsername,
      passwordHash,
      role: "ADMIN" as Role,
      receivesMonopolyAlerts: true,
      mustChangePassword: true,
    },
  });

  await prisma.appSettings.create({
    data: {
      id: "default",
      monopolyWindowDays: 14,
      monopolyHoursThreshold: 10,
      monopolyShareThreshold: 0.35,
    },
  });

  console.log(`Empty board ready. Sign in as ${adminUsername} and add gyms, teams, and people.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
