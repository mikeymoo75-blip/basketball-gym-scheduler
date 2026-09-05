import {
  PrismaClient,
  type BlockKind,
  type Role,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { addDays, setHours, setMinutes, startOfDay, startOfWeek } from "date-fns";

const prisma = new PrismaClient();

async function at(day: Date, hour: number, minute = 0) {
  return setMinutes(setHours(startOfDay(day), hour), minute);
}

async function main() {
  await prisma.notification.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.blockedPeriod.deleteMany();
  await prisma.gym.deleteMany();
  await prisma.user.deleteMany();
  await prisma.appSettings.deleteMany();

  const adminPassword = await hash("MPtravel1!", 10);
  const secondaryAdminPassword = await hash("CourtlineAdmin1!", 10);
  const coachPassword = await hash("CoachPass1!", 10);

  const jordan = await prisma.user.create({
    data: {
      name: "Jordan Hale",
      email: "admin",
      passwordHash: adminPassword,
      role: "ADMIN" as Role,
      receivesMonopolyAlerts: true,
    },
  });

  const pat = await prisma.user.create({
    data: {
      name: "Pat Nguyen",
      email: "pat.nguyen@courtline.local",
      passwordHash: secondaryAdminPassword,
      role: "ADMIN" as Role,
      receivesMonopolyAlerts: true,
    },
  });

  const marcus = await prisma.user.create({
    data: {
      name: "Marcus Reid",
      email: "marcus.reid@courtline.local",
      passwordHash: coachPassword,
      role: "COACH",
    },
  });

  const aisha = await prisma.user.create({
    data: {
      name: "Aisha Cole",
      email: "aisha.cole@courtline.local",
      passwordHash: coachPassword,
      role: "COACH",
    },
  });

  const jen = await prisma.user.create({
    data: {
      name: "Jen Park",
      email: "jen.park@courtline.local",
      passwordHash: coachPassword,
      role: "COACH",
    },
  });

  const devon = await prisma.user.create({
    data: {
      name: "Devon Hale",
      email: "devon.hale@courtline.local",
      passwordHash: coachPassword,
      role: "COACH",
    },
  });

  const gyms = await Promise.all(
    [
      { name: "Godwin", address: "Godwin Gym" },
      { name: "Highland 1", address: "Highland gym near side" },
      { name: "Highland 2", address: "Highland Gym Far side" },
      { name: "MP High School 1", address: "Midland Park High School", notes: "Competition gym" },
      { name: "MP High School 2", address: "Midland Park High School", notes: "Auxiliary gym" },
      { name: "Eastern Christian", address: "Eastern Christian School", notes: "Shared-use floor" },
      { name: "The Barn", address: "The DePhillips Center" },
    ].map((gym, index) =>
      prisma.gym.create({
        data: { ...gym, sortOrder: index },
      })
    )
  );

  const byName = Object.fromEntries(gyms.map((gym) => [gym.name, gym]));

  await prisma.appSettings.create({
    data: {
      id: "default",
      monopolyWindowDays: 14,
      monopolyHoursThreshold: 10,
      monopolyShareThreshold: 0.35,
    },
  });

  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });

  const bookings: {
    gym: string;
    userId: string;
    dayOffset: number;
    startHour: number;
    startMinute?: number;
    hours: number;
    notes?: string;
  }[] = [
    { gym: "Godwin", userId: devon.id, dayOffset: 0, startHour: 18, hours: 1, notes: "Varsity skill work" },
    { gym: "Godwin", userId: devon.id, dayOffset: 0, startHour: 19, hours: 1, notes: "Varsity skill work" },
    { gym: "Highland 1", userId: devon.id, dayOffset: 1, startHour: 17, hours: 1, notes: "Full-court press" },
    { gym: "Highland 1", userId: devon.id, dayOffset: 1, startHour: 18, hours: 1, notes: "Full-court press" },
    { gym: "MP High School 1", userId: devon.id, dayOffset: 2, startHour: 18, hours: 1, notes: "Zone breakdown" },
    { gym: "MP High School 1", userId: devon.id, dayOffset: 2, startHour: 19, hours: 1, notes: "Zone breakdown" },
    { gym: "Eastern Christian", userId: devon.id, dayOffset: 3, startHour: 17, startMinute: 30, hours: 1, notes: "Shooting circuit" },
    { gym: "Eastern Christian", userId: devon.id, dayOffset: 3, startHour: 18, startMinute: 30, hours: 1, notes: "Shooting circuit" },
    { gym: "Godwin", userId: devon.id, dayOffset: 7, startHour: 18, hours: 1, notes: "Film + walkthrough" },
    { gym: "Godwin", userId: devon.id, dayOffset: 7, startHour: 19, hours: 1, notes: "Film + walkthrough" },
    { gym: "Highland 2", userId: devon.id, dayOffset: 8, startHour: 17, hours: 1, notes: "Scrimmage" },
    { gym: "Highland 2", userId: devon.id, dayOffset: 8, startHour: 18, hours: 1, notes: "Scrimmage" },
    { gym: "MP High School 2", userId: devon.id, dayOffset: 9, startHour: 18, hours: 1, notes: "Conditioning" },
    { gym: "MP High School 2", userId: devon.id, dayOffset: 9, startHour: 19, hours: 1, notes: "Conditioning" },
    { gym: "Godwin", userId: marcus.id, dayOffset: 0, startHour: 16, hours: 1, notes: "Freshman fundamentals" },
    { gym: "Highland 2", userId: marcus.id, dayOffset: 2, startHour: 16, hours: 1 },
    { gym: "Eastern Christian", userId: aisha.id, dayOffset: 1, startHour: 19, hours: 1, notes: "Guard development" },
    { gym: "Highland 1", userId: aisha.id, dayOffset: 4, startHour: 10, hours: 1, notes: "Saturday clinic" },
    { gym: "MP High School 2", userId: jen.id, dayOffset: 3, startHour: 16, hours: 1, notes: "JV walkthrough" },
    { gym: "Godwin", userId: jen.id, dayOffset: 10, startHour: 16, hours: 1 },
  ];

  for (const item of bookings) {
    const day = addDays(monday, item.dayOffset);
    const startAt = await at(day, item.startHour, item.startMinute ?? 0);
    const endAt = new Date(startAt.getTime() + item.hours * 60 * 60 * 1000);
    await prisma.booking.create({
      data: {
        gymId: byName[item.gym].id,
        userId: item.userId,
        startAt,
        endAt,
        notes: item.notes,
      },
    });
  }

  const blocks: {
    gym: string;
    dayOffset: number;
    startHour: number;
    endHour: number;
    title: string;
    kind: BlockKind;
  }[] = [
    {
      gym: "Godwin",
      dayOffset: 4,
      startHour: 17,
      endHour: 22,
      title: "Varsity vs. Ridgewood",
      kind: "GAME",
    },
    {
      gym: "Highland 1",
      dayOffset: 5,
      startHour: 12,
      endHour: 17,
      title: "JV Tournament",
      kind: "GAME",
    },
    {
      gym: "MP High School 1",
      dayOffset: 11,
      startHour: 15,
      endHour: 22,
      title: "District playoffs",
      kind: "EVENT",
    },
  ];

  for (const item of blocks) {
    const day = addDays(monday, item.dayOffset);
    await prisma.blockedPeriod.create({
      data: {
        gymId: byName[item.gym].id,
        startAt: await at(day, item.startHour),
        endAt: await at(day, item.endHour),
        title: item.title,
        kind: item.kind,
      },
    });
  }

  const hours = 14;
  const body = `Devon Hale now holds ${hours.toFixed(1)} hours in the last 14 days (limit 10) and a large share of booked gym time. Review the usage board before approving more practices.`;
  const meta = JSON.stringify({
    userId: devon.id,
    hours,
    share: 0.55,
    windowDays: 14,
  });

  await prisma.notification.createMany({
    data: [jordan.id, pat.id].map((userId) => ({
      userId,
      type: "MONOPOLY" as const,
      title: "Devon Hale is monopolizing gym time",
      body,
      meta,
    })),
  });

  console.log("Seeded MP Basketball with gyms, coaches, bookings, games, and monopoly alerts.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
