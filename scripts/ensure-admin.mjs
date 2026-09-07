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

const STARTER_TEAM_NAMES = [
  "Varsity Boys",
  "Varsity Girls",
  "JV Boys",
  "JV Girls",
  "Freshman Boys",
  "Recreation / Clinic",
];

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

  if ((await prisma.gym.count()) === 0) {
    await prisma.gym.createMany({
      data: GYMS.map((gym, index) => ({ ...gym, sortOrder: index })),
    });
    console.log(`Created ${GYMS.length} gyms.`);
  }

  const starterTeams = await prisma.team.findMany({
    where: { name: { in: STARTER_TEAM_NAMES } },
    select: { id: true, name: true },
  });
  if (starterTeams.length) {
    const ids = starterTeams.map((team) => team.id);
    await prisma.booking.updateMany({
      where: { teamId: { in: ids } },
      data: { teamId: null },
    });
    await prisma.team.deleteMany({ where: { id: { in: ids } } });
    console.log(`Removed ${starterTeams.length} starter teams. Add your own under Teams.`);
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
