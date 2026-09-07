import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "admin").toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "MPtravel1!";

const GYMS = [
  { name: "Godwin", address: "Godwin Gym" },
  { name: "Highland 1", address: "Highland Gym Near Side" },
  { name: "Highland 2", address: "Highland Gym Far Side" },
  { name: "MP High School 1", address: "Midland Park High School", notes: "Competition gym" },
  { name: "MP High School 2", address: "Midland Park High School", notes: "Auxiliary gym" },
  { name: "Eastern Christian", address: "Eastern Christian School", notes: "Shared-use floor" },
  { name: "The Barn", address: "The DePhillips Center" },
];

async function main() {
  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: ADMIN_USERNAME },
    update: {
      passwordHash,
      role: "ADMIN",
      active: true,
      receivesMonopolyAlerts: true,
      mustChangePassword: false,
    },
    create: {
      name: "Scheduler admin",
      email: ADMIN_USERNAME,
      passwordHash,
      role: "ADMIN",
      active: true,
      receivesMonopolyAlerts: true,
      mustChangePassword: false,
    },
  });
  console.log(`Wired admin login ready: ${ADMIN_USERNAME} (password from ADMIN_PASSWORD in .env)`);

  if ((await prisma.gym.count()) === 0) {
    await prisma.gym.createMany({
      data: GYMS.map((gym, index) => ({ ...gym, sortOrder: index })),
    });
    console.log(`Created ${GYMS.length} gyms.`);
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      monopolyWindowDays: 14,
      monopolyHoursThreshold: 10,
      monopolyShareThreshold: 0.35,
      starterTeamsCleared: false,
    },
  });

  if (!settings.starterTeamsCleared) {
    const teamCount = await prisma.team.count();
    await prisma.booking.updateMany({ data: { teamId: null } });
    await prisma.coachTeam.deleteMany();
    await prisma.team.deleteMany();
    await prisma.appSettings.update({
      where: { id: "default" },
      data: { starterTeamsCleared: true },
    });
    if (teamCount > 0) {
      console.log(`Removed ${teamCount} leftover starter team(s).`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
