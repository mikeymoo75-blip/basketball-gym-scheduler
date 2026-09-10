"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Printer, Search } from "lucide-react";
import {
  BookingDialog,
  durationFromRange,
  type BookingDraft,
  type CoachOption,
  type TeamOption,
} from "@/components/booking-dialog";
import { BlockDialog } from "@/components/block-dialog";
import { teamsForPerson } from "@/lib/teams";
import { EventDetail } from "@/components/event-detail";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  formatMonthLabel,
  formatRange,
  formatWeekLabel,
  isBookableStart,
  closedCalendarDate,
  overlaps,
  timeOptions,
  toDateInput,
  toTimeInput,
  WEEK_STARTS_ON,
} from "@/lib/time";
import { gymInitials, gymStyle } from "@/lib/gym-style";
import { findOpenSlotsAction } from "@/lib/actions";
import { type OccupiedSlot } from "@/lib/occupancy";
import { BARN_BOOKING_MESSAGE, firstBookableGym, isBarnGym } from "@/lib/barn";
import { SCHOOL_IN_SESSION_TITLE } from "@/lib/mp-school-calendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type GymOption = {
  id: string;
  name: string;
  address?: string | null;
  notes?: string | null;
  bookFrom?: string;
  bookUntil?: string;
};

export type BoardBooking = {
  id: string;
  gymId: string;
  gymName: string;
  userId: string;
  userName: string;
  teamId: string;
  teamName: string;
  startAt: string;
  endAt: string;
  notes: string | null;
};

export type BoardBlock = {
  id: string;
  gymId: string;
  gymName: string;
  title: string;
  kind: "GAME" | "EVENT" | "MAINTENANCE" | "CLOSED";
  startAt: string;
  endAt: string;
};

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
const HOUR_PX = 56;

function coversDay(startAt: string, endAt: string, day: Date) {
  const key = format(day, "yyyy-MM-dd");
  const closedOn = closedCalendarDate(new Date(startAt), new Date(endAt));
  return closedOn === key;
}

function blockTouchesDay(block: BoardBlock, day: Date) {
  if (block.kind === "CLOSED") return coversDay(block.startAt, block.endAt, day);
  return (
    isSameDay(new Date(block.startAt), day) ||
    (new Date(block.startAt) < addDays(day, 1) && new Date(block.endAt) > day)
  );
}

function isSchoolInSession(block: BoardBlock) {
  return block.title === SCHOOL_IN_SESSION_TITLE;
}

function closedBlocksOn(blocks: BoardBlock[], day: Date) {
  return blocks.filter((block) => block.kind === "CLOSED" && coversDay(block.startAt, block.endAt, day));
}

function isDayClosed(blocks: BoardBlock[], day: Date, showGym: boolean, gymCount: number) {
  const closed = closedBlocksOn(blocks, day);
  if (closed.length === 0) return false;
  if (!showGym) return true;
  return new Set(closed.map((block) => block.gymId)).size >= gymCount && gymCount > 0;
}

function isSlotBlocked(
  blocks: BoardBlock[],
  day: Date,
  hour: number,
  minute: number,
  showGym: boolean,
  gymCount: number,
) {
  const start = new Date(day);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const hits = blocks.filter((block) => {
    if (block.kind === "CLOSED") return false;
    return overlaps(start, end, new Date(block.startAt), new Date(block.endAt));
  });
  if (hits.length === 0) return false;
  if (!showGym) return true;
  return new Set(hits.map((block) => block.gymId)).size >= gymCount && gymCount > 0;
}

function isHourTaken(
  bookings: BoardBooking[],
  blocks: BoardBlock[],
  day: Date,
  hour: number,
  showGym: boolean,
  gymCount: number,
) {
  const start = new Date(day);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  if (end.getTime() <= Date.now()) return true;
  if (isSlotBlocked(blocks, day, hour, 0, showGym, gymCount)) return true;
  const bookingHits = bookings.filter((booking) =>
    overlaps(start, end, new Date(booking.startAt), new Date(booking.endAt)),
  );
  if (bookingHits.length === 0) return false;
  if (!showGym) return true;
  return new Set(bookingHits.map((booking) => booking.gymId)).size >= gymCount && gymCount > 0;
}

function topAndHeight(startAt: Date, endAt: Date, day: Date) {
  const open = new Date(day);
  open.setHours(DAY_START_HOUR, 0, 0, 0);
  const close = new Date(day);
  close.setHours(DAY_END_HOUR, 0, 0, 0);
  const start = startAt < open ? open : startAt;
  const end = endAt > close ? close : endAt;
  const top = ((start.getTime() - open.getTime()) / 3600000) * HOUR_PX;
  const height = Math.max(22, ((end.getTime() - start.getTime()) / 3600000) * HOUR_PX - 3);
  return { top, height };
}

function layoutColumns(items: { start: number; end: number }[]) {
  const order = items
    .map((item, index) => ({ ...item, index }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const placement = new Map<number, { col: number; cols: number }>();
  let cluster: { start: number; end: number; index: number }[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    for (const entry of cluster) {
      let col = columnEnds.findIndex((end) => end <= entry.start);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(entry.end);
      } else {
        columnEnds[col] = entry.end;
      }
      placement.set(entry.index, { col, cols: 0 });
    }
    const cols = columnEnds.length;
    for (const entry of cluster) {
      placement.get(entry.index)!.cols = cols;
    }
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const entry of order) {
    if (cluster.length > 0 && entry.start >= clusterEnd) {
      flush();
    }
    cluster.push(entry);
    clusterEnd = Math.max(clusterEnd, entry.end);
  }
  flush();
  return placement;
}

function groupSchoolBlocks(blocks: BoardBlock[], orderedGymNames: string[]) {
  const groups = new Map<string, { startAt: string; endAt: string; gymNames: string[] }>();
  for (const block of blocks) {
    const key = `${block.startAt}|${block.endAt}`;
    const group = groups.get(key) ?? {
      startAt: block.startAt,
      endAt: block.endAt,
      gymNames: [],
    };
    if (!group.gymNames.includes(block.gymName)) group.gymNames.push(block.gymName);
    groups.set(key, group);
  }
  const rank = (name: string) => {
    const index = orderedGymNames.indexOf(name);
    return index === -1 ? orderedGymNames.length : index;
  };
  return [...groups.values()]
    .map((group) => ({
      ...group,
      gymNames: [...group.gymNames].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)),
    }))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}

type DayEvent =
  | { kind: "block"; block: BoardBlock }
  | { kind: "booking"; booking: BoardBooking };

function eventTimes(event: DayEvent) {
  return event.kind === "block"
    ? { startAt: event.block.startAt, endAt: event.block.endAt, gymName: event.block.gymName }
    : { startAt: event.booking.startAt, endAt: event.booking.endAt, gymName: event.booking.gymName };
}

function groupEventsByStart(events: DayEvent[]) {
  const groups = new Map<string, DayEvent[]>();
  for (const event of events) {
    const key = eventTimes(event).startAt;
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(
    ([left], [right]) => new Date(left).getTime() - new Date(right).getTime(),
  );
}

function sortEventsByGym(events: DayEvent[], orderedGymNames: string[]) {
  const rank = (name: string) => {
    const index = orderedGymNames.indexOf(name);
    return index === -1 ? orderedGymNames.length : index;
  };
  return [...events].sort((a, b) => {
    const gymA = eventTimes(a).gymName;
    const gymB = eventTimes(b).gymName;
    return rank(gymA) - rank(gymB) || gymA.localeCompare(gymB);
  });
}

export function ScheduleBoard({
  gyms,
  coaches,
  teams,
  bookings,
  blocks,
  view,
  gymId,
  date,
  currentUserId,
  isAdmin,
}: {
  gyms: GymOption[];
  coaches: CoachOption[];
  teams: TeamOption[];
  bookings: BoardBooking[];
  blocks: BoardBlock[];
  view: "week" | "month";
  gymId: string;
  date: string;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const anchor = useMemo(() => new Date(`${date}T12:00:00`), [date]);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [blockDraft, setBlockDraft] = useState<BoardBlock | null>(null);
  const [openSlots, setOpenSlots] = useState<{ label: string; gymId: string; date: string; startTime: string }[] | null>(
    null,
  );
  const [slotsPending, setSlotsPending] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [selected, setSelected] = useState<
    | { type: "booking"; item: BoardBooking }
    | { type: "block"; item: BoardBlock }
    | null
  >(null);

  const myTeamIds = useMemo(
    () => new Set(teamsForPerson(teams, currentUserId, isAdmin).map((team) => team.id)),
    [teams, currentUserId, isAdmin],
  );
  const visibleBookings = useMemo(() => {
    if (!mineOnly) return bookings;
    return bookings.filter(
      (booking) =>
        booking.userId === currentUserId ||
        (booking.teamId && myTeamIds.has(booking.teamId)),
    );
  }, [bookings, mineOnly, currentUserId, myTeamIds]);

  const occupied: OccupiedSlot[] = useMemo(
    () => [
      ...bookings.map((booking) => ({
        id: booking.id,
        gymId: booking.gymId,
        gymName: booking.gymName,
        startAt: booking.startAt,
        endAt: booking.endAt,
        label: booking.teamName,
        kind: "booking" as const,
      })),
      ...blocks.map((block) => ({
        id: block.id,
        gymId: block.gymId,
        gymName: block.gymName,
        startAt: block.startAt,
        endAt: block.endAt,
        label: block.title,
        kind: "block" as const,
      })),
    ],
    [bookings, blocks],
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON });
    const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: WEEK_STARTS_ON });
    return eachDayOfInterval({ start, end });
  }, [anchor]);

  const pushState = (next: { view?: string; gym?: string; date?: string }) => {
    const params = new URLSearchParams();
    params.set("view", next.view ?? view);
    params.set("gym", next.gym ?? gymId);
    params.set("date", next.date ?? date);
    router.push(`/schedule?${params.toString()}`);
  };

  const defaultBookGymId = () => {
    if (gymId !== "all") {
      const current = gyms.find((gym) => gym.id === gymId);
      if (current && !isBarnGym(current.name)) return current.id;
    }
    return firstBookableGym(gyms)?.id ?? "";
  };

  const openSlot = (day: Date, hour: number, minute = 0) => {
    const start = new Date(day);
    start.setHours(hour, minute, 0, 0);
    const mine = teamsForPerson(teams, currentUserId, isAdmin);
    setDraft({
      gymId: defaultBookGymId(),
      date: toDateInput(start),
      startTime: toTimeInput(start),
      durationMinutes: 60,
      teamId: mine[0]?.id ?? "",
    });
  };

  const selectedGym = gyms.find((gym) => gym.id === gymId);
  const showingAll = gymId === "all";
  const bookFrom = selectedGym?.bookFrom ?? "06:00";
  const bookUntil = selectedGym?.bookUntil ?? "22:00";
  const defaultStart = timeOptions(bookFrom, bookUntil)[0]?.value ?? "17:00";
  const gymTitle = selectedGym?.name ?? "All gyms";
  const dateLabel =
    view === "week" ? formatWeekLabel(weekDays[0], weekDays[6]) : formatMonthLabel(anchor);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {showingAll ? "Every floor" : "Now viewing"}
          </p>
          <h1 className="font-heading text-3xl font-semibold sm:text-4xl">{gymTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(value) => value && pushState({ view: value })}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={mineOnly ? "mine" : "all"} onValueChange={(value) => setMineOnly(value === "mine")}>
            <TabsList>
              <TabsTrigger value="all">All teams</TabsTrigger>
              <TabsTrigger value="mine">My teams</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                pushState({
                  date: toDateInput(view === "week" ? addDays(anchor, -7) : addMonths(anchor, -1)),
                })
              }
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pushState({ date: toDateInput(new Date()) })}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                pushState({
                  date: toDateInput(view === "week" ? addDays(anchor, 7) : addMonths(anchor, 1)),
                })
              }
            >
              <ChevronRight />
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              if (view !== "week") pushState({ view: "week" });
              window.setTimeout(() => window.print(), 50);
            }}
            className="no-print"
          >
            <Printer />
            Print week
          </Button>
          <Button
            variant="outline"
            className="no-print"
            disabled={slotsPending}
            onClick={async () => {
              setSlotsPending(true);
              const result = await findOpenSlotsAction(showingAll ? "all" : gymId);
              setSlotsPending(false);
              setOpenSlots(result.slots);
            }}
          >
            <Search />
            Open slots
          </Button>
          <Button
            className="no-print"
            onClick={() =>
              setDraft({
                gymId: defaultBookGymId(),
                date,
                startTime: defaultStart,
                durationMinutes: 60,
                teamId: teamsForPerson(teams, currentUserId, isAdmin)[0]?.id ?? "",
              })
            }
          >
            <Plus />
            Book
          </Button>
        </div>
      </div>

      <div className="no-print -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <GymChip
          active={showingAll}
          label="All gyms"
          onClick={() => pushState({ gym: "all" })}
        />
        {gyms.map((gym) => {
          const style = gymStyle(gym.name);
          return (
            <GymChip
              key={gym.id}
              active={gymId === gym.id}
              label={gym.name}
              color={style.bg}
              colorFg={style.fg}
              locked={isBarnGym(gym.name)}
              lockHint={isBarnGym(gym.name) ? BARN_BOOKING_MESSAGE : undefined}
              onClick={() => pushState({ gym: gym.id })}
            />
          );
        })}
      </div>

      <div className="no-print flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {showingAll ? (
          <span>Each colored dot is a gym. Tap a dot for the team and time.</span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-practice" /> Practice
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-game" /> Game
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-event" /> Event / hold
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-closed" /> Closed
            </span>
          </>
        )}
      </div>

      {openSlots ? (
        <div className="no-print rounded-2xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold">Open slots</h2>
            <Button variant="outline" size="sm" onClick={() => setOpenSlots(null)}>
              Close
            </Button>
          </div>
          {openSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No free hours in the next three weeks.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {openSlots.map((slot) => (
                <button
                  key={`${slot.gymId}-${slot.startTime}-${slot.date}`}
                  type="button"
                  className="rounded-lg border px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setOpenSlots(null);
                    setDraft({
                      gymId: slot.gymId,
                      date: slot.date,
                      startTime: slot.startTime,
                      durationMinutes: 60,
                      teamId: teamsForPerson(teams, currentUserId, isAdmin)[0]?.id ?? "",
                    });
                  }}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {view === "week" ? (
        <div className="print-week">
        <WeekGrid
          days={weekDays}
          bookings={visibleBookings}
          blocks={blocks}
          showGym={showingAll}
          gymCount={gyms.length}
          orderedGymNames={gyms.map((gym) => gym.name)}
          bookFrom={showingAll ? "06:00" : bookFrom}
          bookUntil={showingAll ? "22:00" : bookUntil}
          gymLabel={gymTitle}
          gymDetail={
            showingAll
              ? "A colored dot for every booked gym. Tap a dot for details."
              : [selectedGym?.notes, selectedGym?.address].filter(Boolean).join(" · ")
          }
          onSlot={openSlot}
          onBooking={(item) => setSelected({ type: "booking", item })}
          onBlock={(item) => setSelected({ type: "block", item })}
        />
        </div>
      ) : (
        <MonthGrid
          days={monthDays}
          anchor={anchor}
          bookings={visibleBookings}
          blocks={blocks.filter((block) => !isSchoolInSession(block))}
          showGym={showingAll}
          gymCount={gyms.length}
          gymLabel={gymTitle}
          onDay={(day) => pushState({ view: "week", date: toDateInput(day) })}
          onBooking={(item) => setSelected({ type: "booking", item })}
          onBlock={(item) => setSelected({ type: "block", item })}
        />
      )}

      {draft ? (
        <BookingDialog
          open={Boolean(draft)}
          onOpenChange={(open) => {
            if (!open) setDraft(null);
          }}
          gyms={gyms}
          coaches={coaches}
          teams={teams}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          draft={draft}
          occupied={occupied}
        />
      ) : null}

      {blockDraft ? (
        <BlockDialog
          key={blockDraft.id}
          open
          onOpenChange={(open) => {
            if (!open) setBlockDraft(null);
          }}
          gyms={gyms}
          block={blockDraft}
        />
      ) : null}

      <EventDetail
        selected={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onEdit={(booking) => {
          setSelected(null);
          setDraft({
            id: booking.id,
            gymId: booking.gymId,
            date: toDateInput(new Date(booking.startAt)),
            startTime: toTimeInput(new Date(booking.startAt)),
            durationMinutes: durationFromRange(booking.startAt, booking.endAt),
            notes: booking.notes ?? "",
            userId: booking.userId,
            teamId: booking.teamId,
          });
        }}
        onEditBlock={(block) => {
          setSelected(null);
          setBlockDraft(block);
        }}
      />
    </div>
  );
}

function GymChip({
  active,
  label,
  color,
  colorFg,
  locked,
  lockHint,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string;
  colorFg?: string;
  locked?: boolean;
  lockHint?: string;
  onClick: () => void;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const chip = (
    <button
      type="button"
      aria-disabled={locked || undefined}
      aria-label={locked && lockHint ? `${label}. ${lockHint}` : undefined}
      onClick={() => {
        if (locked) {
          setHintOpen(true);
          return;
        }
        onClick();
      }}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
        locked && "cursor-not-allowed border-border bg-muted text-muted-foreground opacity-70",
        !locked && active && !color && "border-primary bg-primary text-primary-foreground",
        !locked && !active && !color && "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
        !locked && !active && color && "text-foreground hover:brightness-95",
      )}
      style={
        locked || !color
          ? undefined
          : active
            ? { backgroundColor: color, borderColor: color, color: colorFg }
            : { backgroundColor: `${color}26`, borderColor: color }
      }
    >
      {color ? (
        <span
          className="size-3 rounded-full ring-1 ring-black/15"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {label}
    </button>
  );

  if (!locked || !lockHint) return chip;

  return (
    <Tooltip open={hintOpen} onOpenChange={(open) => setHintOpen(open)}>
      <TooltipTrigger delay={0} closeOnClick={false} render={chip} />
      <TooltipContent>{lockHint}</TooltipContent>
    </Tooltip>
  );
}

function WeekGrid({
  days,
  bookings,
  blocks,
  showGym,
  gymCount,
  orderedGymNames,
  bookFrom,
  bookUntil,
  gymLabel,
  gymDetail,
  onSlot,
  onBooking,
  onBlock,
}: {
  days: Date[];
  bookings: BoardBooking[];
  blocks: BoardBlock[];
  showGym: boolean;
  gymCount: number;
  orderedGymNames: string[];
  bookFrom: string;
  bookUntil: string;
  gymLabel: string;
  gymDetail?: string;
  onSlot: (day: Date, hour: number, minute?: number) => void;
  onBooking: (item: BoardBooking) => void;
  onBlock: (item: BoardBlock) => void;
}) {
  const todayIndex = days.findIndex((day) => isToday(day));
  const [mobileDay, setMobileDay] = useState(todayIndex >= 0 ? todayIndex : 0);
  const colVisible = (index: number) =>
    index === mobileDay ? "block" : "hidden md:block";

  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <div className="flex flex-col gap-1 border-b bg-primary px-4 py-3 text-primary-foreground sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary-foreground/70">
            Calendar
          </p>
          <p className="font-heading text-2xl font-semibold leading-none">{gymLabel}</p>
        </div>
        {gymDetail ? (
          <p className="max-w-md text-sm text-primary-foreground/80">{gymDetail}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-7 gap-1 border-b px-2 py-2 md:hidden">
        {days.map((day, index) => {
          const closed = isDayClosed(blocks, day, showGym, gymCount);
          const selected = index === mobileDay;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setMobileDay(index)}
              className={cn(
                "rounded-lg px-1 py-1.5 text-center",
                selected && !closed && "bg-primary text-primary-foreground",
                selected && closed && "bg-closed text-closed-foreground",
                !selected && closed && "bg-closed/40 text-closed-foreground",
                !selected && !closed && isToday(day) && "bg-primary/10 text-primary",
                !selected && !closed && !isToday(day) && "text-muted-foreground",
              )}
            >
              <span className="block text-[10px] uppercase tracking-[0.12em]">
                {format(day, "EEE")}
              </span>
              <span className="block font-heading text-base font-semibold leading-none">
                {format(day, "d")}
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-[56px_minmax(0,1fr)] md:grid-cols-[56px_repeat(7,minmax(0,1fr))]">
        <div className="border-b bg-muted/40" />
        {days.map((day, index) => (
          <div
            key={day.toISOString()}
            className={cn(
              "border-b border-l px-2 py-2 text-center",
              colVisible(index),
              isToday(day) && "bg-primary/6",
              isDayClosed(blocks, day, showGym, gymCount) && "bg-closed text-closed-foreground"
            )}
          >
            <p
              className={cn(
                "text-[11px] uppercase tracking-[0.16em] text-muted-foreground",
                isDayClosed(blocks, day, showGym, gymCount) && "text-closed-foreground/70"
              )}
            >
              {format(day, "EEE")}
            </p>
            <p
              className={cn(
                "text-[10px] uppercase tracking-[0.16em] text-muted-foreground",
                isDayClosed(blocks, day, showGym, gymCount) && "text-closed-foreground/70"
              )}
            >
              {format(day, "MMM")}
            </p>
            <p
              className={cn(
                "font-heading text-xl font-semibold",
                isToday(day) && !isDayClosed(blocks, day, showGym, gymCount) && "text-primary",
                isDayClosed(blocks, day, showGym, gymCount) && "text-closed-foreground"
              )}
            >
              {format(day, "d")}
            </p>
          </div>
        ))}
        <div className="relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="border-b pr-2 text-right text-[11px] text-muted-foreground"
              style={{ height: HOUR_PX }}
            >
              <span className="-translate-y-1.5 block">
                {format(new Date(2000, 0, 1, hour), "h a")}
              </span>
            </div>
          ))}
        </div>
        {days.map((day, index) => {
          const closed = closedBlocksOn(blocks, day);
          const dayClosed = isDayClosed(blocks, day, showGym, gymCount);
          const closedLabel = closed[0];
          const schoolGroups =
            dayClosed || !showGym
              ? []
              : groupSchoolBlocks(
                  blocks.filter(
                    (block) => blockTouchesDay(block, day) && isSchoolInSession(block),
                  ),
                  orderedGymNames,
                );
          const dayEvents = dayClosed
            ? []
            : [
                ...blocks
                  .filter(
                    (block) =>
                      blockTouchesDay(block, day) &&
                      !(showGym && isSchoolInSession(block)),
                  )
                  .map((block) => ({ kind: "block" as const, block })),
                ...bookings
                  .filter((booking) => isSameDay(new Date(booking.startAt), day))
                  .map((booking) => ({ kind: "booking" as const, booking })),
              ];
          const eventLayout = showGym
            ? null
            : layoutColumns(
                dayEvents.map((event) => ({
                  start: new Date(eventTimes(event).startAt).getTime(),
                  end: new Date(eventTimes(event).endAt).getTime(),
                })),
              );
          return (
          <div
            key={`col-${day.toISOString()}`}
            className={cn("relative border-l", colVisible(index), dayClosed && "bg-closed")}
          >
            {dayClosed ? (
              <button
                type="button"
                onClick={() => closedLabel && onBlock(closedLabel)}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 px-2 text-center text-closed-foreground"
                style={{ height: HOURS.length * HOUR_PX }}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">
                  Closed
                </span>
                <span className="font-heading text-lg font-semibold leading-tight">
                  {closedLabel?.title ?? "Closed"}
                </span>
              </button>
            ) : (
              HOURS.map((hour) => {
                const open = isBookableStart(hour, 0, bookFrom, bookUntil);
                const blocked =
                  isHourTaken(bookings, blocks, day, hour, showGym, gymCount);
                const label = format(new Date(2000, 0, 1, hour, 0), "h:mm a");
                return (
                  <div
                    key={hour}
                    className="flex flex-col border-b"
                    style={{ height: HOUR_PX }}
                  >
                    {!open || blocked ? (
                      <div
                        className={cn("flex-1", blocked ? "bg-closed" : "bg-muted/40")}
                        aria-hidden
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSlot(day, hour, 0)}
                        className="block w-full flex-1 hover:bg-primary/5"
                        aria-label={`Book ${format(day, "MMM d")} at ${label}`}
                      />
                    )}
                  </div>
                );
              })
            )}
            {dayClosed
              ? null
              : schoolGroups.map((group) => {
                  const start = new Date(group.startAt);
                  const end = new Date(group.endAt);
                  const { top, height } = topAndHeight(start, end, day);
                  return (
                    <div
                      key={`school-${group.startAt}-${group.endAt}`}
                      className="pointer-events-none absolute inset-x-1 overflow-hidden rounded-md bg-muted px-1.5 py-1 text-left text-[11px] leading-tight text-muted-foreground ring-1 ring-border"
                      style={{ top, height }}
                    >
                      <span className="block font-semibold text-foreground">
                        School in session
                      </span>
                      <span className="opacity-80">{formatRange(start, end)}</span>
                      <ul className="mt-1 space-y-0.5">
                        {group.gymNames.map((name) => (
                          <li key={name} className="truncate">
                            {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
            {dayClosed ? null : showGym ? (
              <WeekSlotDots
                events={dayEvents}
                day={day}
                orderedGymNames={orderedGymNames}
                onBooking={onBooking}
                onBlock={onBlock}
              />
            ) : (
              dayEvents.map((event, eventIndex) => {
                const place = eventLayout?.get(eventIndex) ?? { col: 0, cols: 1 };
                const columnStyle: CSSProperties = {
                  left: `calc(${(100 / place.cols) * place.col}% + 2px)`,
                  width: `calc(${100 / place.cols}% - 4px)`,
                };
                if (event.kind === "block") {
                  const block = event.block;
                  const start = new Date(block.startAt);
                  const end = new Date(block.endAt);
                  const { top, height } = topAndHeight(start, end, day);
                  return (
                    <button
                      key={`block-${block.id}`}
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        onBlock(block);
                      }}
                      className={cn(
                        "absolute z-20 overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm",
                        block.kind === "CLOSED" && "bg-closed text-closed-foreground",
                        block.kind === "GAME" && "bg-game text-game-foreground",
                        block.kind !== "GAME" &&
                          block.kind !== "CLOSED" &&
                          "bg-event text-event-foreground",
                      )}
                      style={{ top, height, ...columnStyle }}
                    >
                      <span className="block truncate font-semibold">{block.title}</span>
                      <span className="opacity-80">{formatRange(start, end)}</span>
                    </button>
                  );
                }
                const booking = event.booking;
                const start = new Date(booking.startAt);
                const end = new Date(booking.endAt);
                const { top, height } = topAndHeight(start, end, day);
                return (
                  <button
                    key={`booking-${booking.id}`}
                    type="button"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      onBooking(booking);
                    }}
                    className="absolute z-20 overflow-hidden rounded-md bg-practice px-1.5 py-1 text-left text-[11px] leading-tight text-practice-foreground shadow-sm ring-1 ring-black/5"
                    style={{ top, height, ...columnStyle }}
                  >
                    <span className="block truncate font-semibold">{booking.teamName}</span>
                    <span className="opacity-80">{formatRange(start, end)}</span>
                  </button>
                );
              })
            )}
            {dayClosed ? null : <NowLine day={day} />}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekSlotDots({
  events,
  day,
  orderedGymNames,
  onBooking,
  onBlock,
}: {
  events: DayEvent[];
  day: Date;
  orderedGymNames: string[];
  onBooking: (item: BoardBooking) => void;
  onBlock: (item: BoardBlock) => void;
}) {
  return (
    <>
      {groupEventsByStart(events).map(([startAt, group]) => {
        const start = new Date(startAt);
        const { top } = topAndHeight(start, new Date(eventTimes(group[0]).endAt), day);
        const items = sortEventsByGym(group, orderedGymNames);
        return (
          <div
            key={startAt}
            className="absolute z-20 flex flex-wrap content-start gap-1 px-1"
            style={{ top: top + 8, left: 2, right: 2 }}
          >
            {items.map((event) => {
              const times = eventTimes(event);
              const style = gymStyle(times.gymName);
              const title = event.kind === "block" ? event.block.title : event.booking.teamName;
              const range = formatRange(new Date(times.startAt), new Date(times.endAt));
              const label = `${times.gymName} · ${title} · ${range}`;
              const key = event.kind === "block" ? `block-${event.block.id}` : `booking-${event.booking.id}`;
              const closed = event.kind === "block" && event.block.kind === "CLOSED";
              return (
                <button
                  key={key}
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    if (event.kind === "block") onBlock(event.block);
                    else onBooking(event.booking);
                  }}
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold shadow-sm ring-2 ring-background transition hover:scale-110 sm:size-8 sm:text-[10px]",
                    closed && "bg-closed text-closed-foreground",
                  )}
                  style={closed ? undefined : { backgroundColor: style.bg, color: style.fg }}
                >
                  {gymInitials(times.gymName)}
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

function NowLine({ day }: { day: Date }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  if (!isToday(day)) return null;
  const { top } = topAndHeight(now, new Date(now.getTime() + 60 * 1000), day);
  if (top <= 0 || top >= HOURS.length * HOUR_PX) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 z-30 flex items-center" style={{ top }}>
      <span className="size-2 rounded-full bg-red-500" />
      <span className="h-0.5 flex-1 bg-red-500" />
    </div>
  );
}

function MonthGrid({
  days,
  anchor,
  bookings,
  blocks,
  showGym,
  gymCount,
  gymLabel,
  onDay,
  onBooking,
  onBlock,
}: {
  days: Date[];
  anchor: Date;
  bookings: BoardBooking[];
  blocks: BoardBlock[];
  showGym: boolean;
  gymCount: number;
  gymLabel: string;
  onDay: (day: Date) => void;
  onBooking: (item: BoardBooking) => void;
  onBlock: (item: BoardBlock) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <div className="border-b bg-primary px-4 py-3 text-primary-foreground">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary-foreground/70">
          Calendar
        </p>
        <p className="font-heading text-2xl font-semibold leading-none">{gymLabel}</p>
      </div>
      <div className="grid grid-cols-7 border-b bg-muted/40">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div
            key={label}
            className="px-2 py-2 text-center text-[11px] uppercase tracking-[0.16em] text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayBookings = bookings.filter((item) => isSameDay(new Date(item.startAt), day));
          const dayBlocks = blocks.filter(
            (item) => !isSchoolInSession(item) && blockTouchesDay(item, day),
          );
          const inMonth = isSameMonth(day, anchor);
          const dayClosed = isDayClosed(blocks, day, showGym, gymCount);
          const closedLabel = closedBlocksOn(blocks, day)[0];
          const dayKey = day.toISOString();
          const extra = expanded === dayKey;
          const shownBlocks = extra ? dayBlocks : dayBlocks.slice(0, 2);
          const shownBookings = extra ? dayBookings : dayBookings.slice(0, 3);
          const hidden = dayBookings.length + dayBlocks.length - shownBlocks.length - shownBookings.length;
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-28 border-b border-l p-1.5 sm:min-h-32",
                !inMonth && !dayClosed && "bg-muted/30",
                isToday(day) && !dayClosed && "bg-primary/5",
                dayClosed && "bg-closed text-closed-foreground"
              )}
            >
              <p
                className={cn(
                  "text-[10px] uppercase tracking-[0.14em] text-muted-foreground",
                  dayClosed && "text-closed-foreground/70"
                )}
              >
                {format(day, "MMM")}
              </p>
              <button
                type="button"
                onClick={() => onDay(day)}
                className={cn(
                  "mb-1 flex size-7 items-center justify-center rounded-full text-sm font-medium",
                  isToday(day) && !dayClosed && "bg-primary text-primary-foreground",
                  !inMonth && !dayClosed && "text-muted-foreground",
                  dayClosed && "text-closed-foreground"
                )}
              >
                {format(day, "d")}
              </button>
              {dayClosed ? (
                <button
                  type="button"
                  onClick={() => closedLabel && onBlock(closedLabel)}
                  className="mt-1 w-full text-left text-[11px] leading-tight"
                >
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                    Closed
                  </span>
                  <span className="block truncate font-medium">{closedLabel?.title}</span>
                </button>
              ) : (
              <div className="space-y-1">
                {shownBlocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => onBlock(block)}
                    className={cn(
                      "block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium",
                      block.kind === "CLOSED" && "bg-closed text-closed-foreground",
                      !showGym && block.kind === "GAME" && "bg-game text-game-foreground",
                      !showGym &&
                        block.kind !== "GAME" &&
                        block.kind !== "CLOSED" &&
                        "bg-event text-event-foreground"
                    )}
                    style={
                      showGym && block.kind !== "CLOSED"
                        ? {
                            backgroundColor: gymStyle(block.gymName).bg,
                            color: gymStyle(block.gymName).fg,
                          }
                        : undefined
                    }
                  >
                    {showGym
                      ? `${block.gymName} · ${block.title}${block.kind === "CLOSED" ? "" : ` · ${formatRange(new Date(block.startAt), new Date(block.endAt))}`}`
                      : `${block.title}${block.kind === "CLOSED" ? "" : ` · ${formatRange(new Date(block.startAt), new Date(block.endAt))}`}`}
                  </button>
                ))}
                {shownBookings.map((booking) => (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={() => onBooking(booking)}
                    className="block w-full truncate rounded bg-practice px-1 py-0.5 text-left text-[10px] font-medium text-practice-foreground"
                    style={
                      showGym
                        ? {
                            backgroundColor: gymStyle(booking.gymName).bg,
                            color: gymStyle(booking.gymName).fg,
                          }
                        : undefined
                    }
                  >
                    {showGym
                      ? `${booking.gymName} · ${booking.teamName} · ${formatRange(new Date(booking.startAt), new Date(booking.endAt))}`
                      : `${booking.teamName} · ${formatRange(new Date(booking.startAt), new Date(booking.endAt))}`}
                  </button>
                ))}
                {hidden > 0 ? (
                  <button
                    type="button"
                    className="px-1 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => setExpanded(dayKey)}
                  >
                    +{hidden} more
                  </button>
                ) : extra ? (
                  <button
                    type="button"
                    className="px-1 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => onDay(day)}
                  >
                    Open week
                  </button>
                ) : null}
              </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
