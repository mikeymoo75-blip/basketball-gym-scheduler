import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TITLE = "School in session";
const TIMEZONE = "America/New_York";

const CLOSED = new Set([
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

function schoolInSessionDates() {
  const dates = [];
  const cursor = new Date("2026-09-03T12:00:00Z");
  const last = new Date("2027-06-24T12:00:00Z");
  while (cursor <= last) {
    const key = cursor.toISOString().slice(0, 10);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0 && weekday !== 6 && !CLOSED.has(key)) {
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

const HALF_DAYS = {
  "2026-10-12": true,
  "2026-11-25": true,
  "2026-12-23": true,
  "2027-02-01": true,
  "2027-03-15": true,
  "2027-06-24": true,
};

function bounds(dateValue) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const half = Boolean(HALF_DAYS[dateValue]);
  return {
    startAt: fromNy(year, month, day, 6, 0),
    endAt: fromNy(year, month, day, half ? 12 : 17, half ? 30 : 0),
  };
}

async function main() {
  const dates = schoolInSessionDates();
  if (dates.length !== 184) {
    throw new Error(`Expected 184 student days, got ${dates.length}.`);
  }

  const already = await prisma.blockedPeriod.count({
    where: { title: TITLE, startAt: { gte: fromNy(2026, 9, 3, 0, 0) } },
  });
  if (already > 0) {
    let patched = 0;
    for (const iso of Object.keys(HALF_DAYS)) {
      const [year, month, day] = iso.split("-").map(Number);
      const startAt = fromNy(year, month, day, 6, 0);
      const fullEnd = fromNy(year, month, day, 17, 0);
      const halfEnd = fromNy(year, month, day, 12, 30);
      const result = await prisma.blockedPeriod.updateMany({
        where: {
          title: TITLE,
          startAt,
          endAt: fullEnd,
        },
        data: { endAt: halfEnd },
      });
      patched += result.count;
    }
    console.log(
      `School-in-session hours already on the board (${already} holds). Patched ${patched} official half-day rows to 12:30 PM.`,
    );
    return;
  }

  const gyms = await prisma.gym.findMany({
    where: {
      active: true,
      name: { in: ["Godwin", "Highland 1", "Highland 2", "MP High School 1", "MP High School 2"] },
    },
    select: { id: true, name: true },
  });
  if (gyms.length === 0) {
    console.log("No district gyms yet. Add gyms first, then school hours can be loaded.");
    return;
  }

  const rows = [];
  for (const date of dates) {
    const { startAt, endAt } = bounds(date);
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

  const firstStart = bounds(dates[0]).startAt;
  const lastEnd = bounds(dates[dates.length - 1]).endAt;
  const candidates = await prisma.booking.findMany({
    where: {
      gymId: { in: gyms.map((gym) => gym.id) },
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
    `Blocked school hours on ${dates.length} student days at ${gyms.length} district gyms (${rows.length} holds). Full days 6:00 AM–5:00 PM; six official half days end at 12:30 PM. Source: Midland Park 2026–2027 calendar, board approved 2/24/2026.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
