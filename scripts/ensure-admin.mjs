import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { spawnSync } from "node:child_process";

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
      name: "Site Admin",
      passwordHash,
      role: "ADMIN",
      active: true,
      receivesMonopolyAlerts: true,
      mustChangePassword: false,
    },
    create: {
      name: "Site Admin",
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

  const closed = await prisma.blockedPeriod.findMany({ where: { kind: "CLOSED" } });
  let rewritten = 0;
  for (const block of closed) {
    const start = block.startAt;
    const end = block.endAt;
    const intended =
      start.getUTCHours() === 0 && start.getUTCMinutes() === 0 && end.getUTCHours() === 23
        ? start.toISOString().slice(0, 10)
        : new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/New_York",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(start);
    const [year, month, day] = intended.split("-").map(Number);
    const utcGuess = (hour, minute, second) => Date.UTC(year, month - 1, day, hour, minute, second);
    const offsetMs = (instant) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(instant);
      const get = (type) => Number(parts.find((part) => part.type === type)?.value ?? "0");
      return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - instant.getTime();
    };
    const fromNy = (hour, minute, second) => {
      const guess = utcGuess(hour, minute, second);
      const first = guess - offsetMs(new Date(guess));
      return new Date(guess - offsetMs(new Date(first)));
    };
    const nextStart = fromNy(0, 0, 0);
    const nextEnd = fromNy(23, 59, 59);
    if (nextStart.getTime() !== start.getTime() || nextEnd.getTime() !== end.getTime()) {
      await prisma.blockedPeriod.update({
        where: { id: block.id },
        data: { startAt: nextStart, endAt: nextEnd },
      });
      rewritten += 1;
    }
  }
  if (rewritten > 0) {
    console.log(`Shifted ${rewritten} closed day(s) so they only cover the date that was picked.`);
  }

  const seeded = spawnSync(process.execPath, ["scripts/seed-school-hours.mjs"], {
    stdio: "inherit",
  });
  if (seeded.status) {
    throw new Error("Could not load Midland Park school-in-session hours.");
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
