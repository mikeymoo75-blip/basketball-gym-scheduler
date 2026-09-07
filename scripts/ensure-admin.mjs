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

const TEAMS = [
  { name: "Varsity Boys", notes: "High school varsity" },
  { name: "Varsity Girls", notes: "High school varsity" },
  { name: "JV Boys", notes: "Junior varsity" },
  { name: "JV Girls", notes: "Junior varsity" },
  { name: "Freshman Boys", notes: "Ninth grade" },
  { name: "Recreation / Clinic", notes: "Rec and Saturday clinic" },
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

  if ((await prisma.team.count()) === 0) {
    await prisma.team.createMany({
      data: TEAMS.map((team, index) => ({ ...team, sortOrder: index })),
    });
    console.log(`Created ${TEAMS.length} teams.`);
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
