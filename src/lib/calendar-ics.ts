function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function icsUtc(date: Date) {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function fold(line: string) {
  return line.replace(/\r?\n/g, "\\n");
}

export function bookingToIcs(input: {
  id: string;
  title: string;
  gymName: string;
  startAt: string;
  endAt: string;
  notes?: string | null;
}) {
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  const stamp = icsUtc(new Date());
  const description = input.notes?.trim()
    ? fold(`Practice at ${input.gymName}. ${input.notes.trim()}`)
    : fold(`Practice at ${input.gymName}.`);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MP Basketball//Gym Scheduler//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.id}@mp-basketball`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsUtc(start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${fold(input.title)}`,
    `LOCATION:${fold(input.gymName)}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadIcs(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
