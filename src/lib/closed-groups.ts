import { closedCalendarDate } from "@/lib/time";

export type ClosedGroupable = {
  id: string;
  gymId: string;
  gymName: string;
  title: string;
  kind: string;
  startAt: string;
  endAt: string;
  whenLabel: string;
};

export type ClosedDayGroup<T extends ClosedGroupable> = {
  key: string;
  title: string;
  date: string;
  startAt: string;
  whenLabel: string;
  gymNames: string[];
  blocks: T[];
};

export function groupClosedDays<T extends ClosedGroupable>(
  blocks: T[],
  gymOrder: string[],
): ClosedDayGroup<T>[] {
  const order = new Map(gymOrder.map((name, index) => [name, index]));
  const groups = new Map<string, T[]>();
  for (const block of blocks) {
    if (block.kind !== "CLOSED") continue;
    const date = closedCalendarDate(new Date(block.startAt), new Date(block.endAt));
    const key = `${date}\0${block.title}`;
    const list = groups.get(key);
    if (list) list.push(block);
    else groups.set(key, [block]);
  }
  return [...groups.entries()].map(([key, grouped]) => {
    const names = [...new Set(grouped.map((block) => block.gymName))].sort(
      (a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99),
    );
    return {
      key,
      title: grouped[0]?.title ?? "",
      date: key.split("\0")[0] ?? "",
      startAt: grouped[0]?.startAt ?? "",
      whenLabel: grouped[0]?.whenLabel ?? "",
      gymNames: names,
      blocks: grouped,
    };
  });
}
