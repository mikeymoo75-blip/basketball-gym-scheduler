import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TITLE = "School in session";
const TIMEZONE = "America/New_York";

const DISTRICT_GYMS = [
  "Godwin",
  "Highland 1",
  "Highland 2",
  "MP High School 1",
  "MP High School 2",
];

const DISTRICT_CLOSED = new Set([
  "2026-09-07",
  "2026-09-21",
  "2026-11-05",
  "2026-11-06",
  "2026-11-26",
  "2026-11-27",
  "2026-12-24",
  "2026-12-25",
  "2026-12-28",
  "2026-12-29",
  "2026-12-30",
  "2026-12-31",
  "2027-01-01",
  "2027-01-18",
  "2027-02-15",
  "2027-02-16",
  "2027-02-17",
  "2027-02-18",
  "2027-02-19",
  "2027-03-10",
  "2027-03-26",
  "2027-04-12",
  "2027-04-13",
  "2027-04-14",
  "2027-04-15",
  "2027-04-16",
  "2027-05-31",
]);

const DISTRICT_HALF_DAYS = {
  "2026-10-12": true,
  "2026-11-25": true,
  "2026-12-23": true,
  "2027-02-01": true,
  "2027-03-15": true,
  "2027-06-24": true,
};

const EC_GYMS = ["Eastern Christian"];

const EC_CLOSED = new Set([
  "2026-09-07",
  "2026-10-08",
  "2026-10-09",
  "2026-10-12",
  "2026-11-05",
  "2026-11-06",
  "2026-11-26",
  "2026-11-27",
  "2026-12-24",
  "2026-12-25",
  "2026-12-28",
  "2026-12-29",
  "2026-12-30",
  "2026-12-31",
  "2027-01-01",
  "2027-01-18",
  "2027-02-11",
  "2027-02-12",
  "2027-02-15",
  "2027-03-26",
  "2027-03-29",
  "2027-03-30",
  "2027-03-31",
  "2027-04-01",
  "2027-04-02",
  "2027-04-08",
  "2027-04-09",
  "2027-05-06",
  "2027-05-07",
  "2027-05-31",
]);

const EC_HALF_DAYS = {
  "2026-11-25": true,
  "2026-12-23": true,
  "2027-06-17": true,
};

function studentDays(first, last, closed) {
  const dates = [];
  const cursor = new Date(`${first}T12:00:00Z`);
  const end = new Date(`${last}T12:00:00Z`);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6 && !closed.has(key)) {
      dates.push(key);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function zoneOffsetMs(instant) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return (
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) -
    instant.getTime()
  );
}

function fromNy(year, month, day, hour, minute) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const first = guess - zoneOffsetMs(new Date(guess));
  return new Date(guess - zoneOffsetMs(new Date(first)));
}

function bounds(dateValue, halfDays) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const half = Boolean(halfDays[dateValue]);
  return {
    startAt: fromNy(year, month, day, 6, 0),
    endAt: fromNy(year, month, day, half ? 12 : 17, half ? 30 : 0),
  };
}

async function ensureCalendar({
  gymNames,
  dates,
  halfDays,
  expectedCount,
  label,
}) {
  if (dates.length !== expectedCount) {
    throw new Error(`${label}: expected ${expectedCount} student days, got ${dates.length}.`);
  }

  const gyms = await prisma.gym.findMany({
    where: { active: true, name: { in: gymNames } },
    select: { id: true, name: true },
  });
  if (gyms.length === 0) {
    console.log(`No ${label} gyms yet. Add them first, then school hours can be loaded.`);
    return;
  }

  const gymIds = gyms.map((gym) => gym.id);
  const already = await prisma.blockedPeriod.count({
    where: {
      title: TITLE,
      gymId: { in: gymIds },
      startAt: { gte: fromNy(2026, 8, 1, 0, 0) },
    },
  });
  if (already > 0) {
    let patched = 0;
    for (const iso of Object.keys(halfDays)) {
      const [year, month, day] = iso.split("-").map(Number);
      const startAt = fromNy(year, month, day, 6, 0);
      const fullEnd = fromNy(year, month, day, 17, 0);
      const halfEnd = fromNy(year, month, day, 12, 30);
      const result = await prisma.blockedPeriod.updateMany({
        where: {
          title: TITLE,
          gymId: { in: gymIds },
          startAt,
          endAt: fullEnd,
        },
        data: { endAt: halfEnd },
      });
      patched += result.count;
    }
    console.log(
      `${label} school hours already on the board (${already} holds). Patched ${patched} half-day rows to 12:30 PM.`,
    );
    return;
  }

  const rows = [];
  for (const date of dates) {
    const { startAt, endAt } = bounds(date, halfDays);
    for (const gym of gyms) {
      rows.push({
        gymId: gym.id,
        startAt,
        endAt,
        title: TITLE,
        kind: "MAINTENANCE",
      });
    }
  }

  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    await prisma.blockedPeriod.createMany({ data: rows.slice(i, i + chunk) });
  }

  const firstStart = bounds(dates[0], halfDays).startAt;
  const lastEnd = bounds(dates[dates.length - 1], halfDays).endAt;
  const candidates = await prisma.booking.findMany({
    where: {
      gymId: { in: gymIds },
      startAt: { lt: lastEnd },
      endAt: { gt: firstStart },
    },
    select: { id: true, gymId: true, startAt: true, endAt: true },
  });
  const clashIds = candidates
    .filter((booking) =>
      rows.some(
        (row) =>
          row.gymId === booking.gymId &&
          booking.startAt < row.endAt &&
          booking.endAt > row.startAt,
      ),
    )
    .map((booking) => booking.id);
  if (clashIds.length) {
    await prisma.booking.deleteMany({ where: { id: { in: clashIds } } });
  }

  console.log(
    `Blocked ${label} school hours on ${dates.length} student days at ${gyms.length} gym${gyms.length === 1 ? "" : "s"} (${rows.length} holds). Full days 6:00 AM–5:00 PM; official half days end at 12:30 PM.`,
  );
}

async function main() {
  await ensureCalendar({
    gymNames: DISTRICT_GYMS,
    dates: studentDays("2026-09-03", "2027-06-24", DISTRICT_CLOSED),
    halfDays: DISTRICT_HALF_DAYS,
    expectedCount: 184,
    label: "Midland Park public",
  });
  await ensureCalendar({
    gymNames: EC_GYMS,
    dates: studentDays("2026-09-01", "2027-06-17", EC_CLOSED),
    halfDays: EC_HALF_DAYS,
    expectedCount: 178,
    label: "Eastern Christian",
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
