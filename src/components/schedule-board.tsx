"use client";

import { useMemo, useState } from "react";
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
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  BookingDialog,
  durationFromRange,
  type BookingDraft,
  type CoachOption,
  type TeamOption,
} from "@/components/booking-dialog";
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
import { gymStyle } from "@/lib/gym-style";
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
  const [selected, setSelected] = useState<
    | { type: "booking"; item: BoardBooking }
    | { type: "block"; item: BoardBlock }
    | null
  >(null);

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

  const openSlot = (day: Date, hour: number, minute = 0) => {
    const start = new Date(day);
    start.setHours(hour, minute, 0, 0);
    const mine = teamsForPerson(teams, currentUserId, isAdmin);
    setDraft({
      gymId: gymId === "all" ? gyms[0]?.id ?? "" : gymId,
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
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(value) => value && pushState({ view: value })}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
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
            onClick={() =>
              setDraft({
                gymId: gymId === "all" ? gyms[0]?.id ?? "" : gymId,
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

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <GymChip
          active={showingAll}
          label="All gyms"
          onClick={() => pushState({ gym: "all" })}
        />
        {gyms.map((gym) => (
          <GymChip
            key={gym.id}
            active={gymId === gym.id}
            label={gym.name}
            color={gymStyle(gym.name).bg}
            onClick={() => pushState({ gym: gym.id })}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {showingAll ? (
          <span>Each card is labeled and colored by gym. Pick a chip to see one floor only.</span>
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

      {view === "week" ? (
        <WeekGrid
          days={weekDays}
          bookings={bookings}
          blocks={blocks}
          showGym={showingAll}
          gymCount={gyms.length}
          bookFrom={showingAll ? "06:00" : bookFrom}
          bookUntil={showingAll ? "22:00" : bookUntil}
          gymLabel={gymTitle}
          gymDetail={
            showingAll
              ? "Practices and holds from every floor. Each card is labeled with its gym."
              : [selectedGym?.notes, selectedGym?.address].filter(Boolean).join(" · ")
          }
          onSlot={openSlot}
          onBooking={(item) => setSelected({ type: "booking", item })}
          onBlock={(item) => setSelected({ type: "block", item })}
        />
      ) : (
        <MonthGrid
          days={monthDays}
          anchor={anchor}
          bookings={bookings}
          blocks={blocks}
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
      />
    </div>
  );
}

function GymChip({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent"
      )}
    >
      {color ? (
        <span
          className="size-2.5 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: active ? "currentColor" : color }}
        />
      ) : null}
      {label}
    </button>
  );
}

function WeekGrid({
  days,
  bookings,
  blocks,
  showGym,
  gymCount,
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
  bookFrom: string;
  bookUntil: string;
  gymLabel: string;
  gymDetail?: string;
  onSlot: (day: Date, hour: number, minute?: number) => void;
  onBooking: (item: BoardBooking) => void;
  onBlock: (item: BoardBlock) => void;
}) {
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
      <div className="grid grid-cols-[56px_repeat(7,minmax(120px,1fr))] overflow-x-auto">
        <div className="border-b bg-muted/40" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "border-b border-l px-2 py-2 text-center",
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
        {days.map((day) => {
          const closed = closedBlocksOn(blocks, day);
          const dayClosed = isDayClosed(blocks, day, showGym, gymCount);
          const closedLabel = closed[0];
          return (
          <div
            key={`col-${day.toISOString()}`}
            className={cn("relative border-l", dayClosed && "bg-closed")}
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
              HOURS.map((hour) => (
                <div
                  key={hour}
                  className="flex flex-col border-b"
                  style={{ height: HOUR_PX }}
                >
                  {[0, 30].map((minute) => {
                    const open = isBookableStart(hour, minute, bookFrom, bookUntil);
                    const blocked = isSlotBlocked(blocks, day, hour, minute, showGym, gymCount);
                    const label = format(new Date(2000, 0, 1, hour, minute), "h:mm a");
                    if (!open || blocked) {
                      return (
                        <div
                          key={minute}
                          className={cn("flex-1", blocked ? "bg-closed" : "bg-muted/40")}
                          aria-hidden
                        />
                      );
                    }
                    return (
                      <button
                        key={minute}
                        type="button"
                        onClick={() => onSlot(day, hour, minute)}
                        className="block w-full flex-1 hover:bg-primary/5"
                        aria-label={`Book ${format(day, "MMM d")} at ${label}`}
                      />
                    );
                  })}
                </div>
              ))
            )}
            {dayClosed
              ? null
              : blocks
              .filter((block) => blockTouchesDay(block, day))
              .map((block) => {
                const start = new Date(block.startAt);
                const end = new Date(block.endAt);
                const { top, height } = topAndHeight(start, end, day);
                return (
                  <button
                    key={block.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onBlock(block);
                    }}
                    className={cn(
                      "absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm",
                      block.kind === "CLOSED" && "bg-closed text-closed-foreground",
                      !showGym && block.kind === "GAME" && "bg-game text-game-foreground",
                      !showGym &&
                        block.kind !== "GAME" &&
                        block.kind !== "CLOSED" &&
                        "bg-event text-event-foreground"
                    )}
                    style={{
                      top,
                      height,
                      ...(showGym && block.kind !== "CLOSED"
                        ? {
                            backgroundColor: gymStyle(block.gymName).bg,
                            color: gymStyle(block.gymName).fg,
                          }
                        : {}),
                    }}
                  >
                    {showGym ? (
                      <span className="block font-semibold uppercase tracking-[0.08em]">
                        {block.gymName}
                      </span>
                    ) : null}
                    <span className="block font-semibold">{block.title}</span>
                    <span className="opacity-80">{formatRange(start, end)}</span>
                  </button>
                );
              })}
            {dayClosed
              ? null
              : bookings
              .filter((booking) => isSameDay(new Date(booking.startAt), day))
              .map((booking) => {
                const start = new Date(booking.startAt);
                const end = new Date(booking.endAt);
                const { top, height } = topAndHeight(start, end, day);
                return (
                  <button
                    key={booking.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onBooking(booking);
                    }}
                    className="absolute inset-x-1 overflow-hidden rounded-md bg-practice px-1.5 py-1 text-left text-[11px] leading-tight text-practice-foreground shadow-sm ring-1 ring-black/5"
                    style={{
                      top,
                      height,
                      ...(showGym
                        ? {
                            backgroundColor: gymStyle(booking.gymName).bg,
                            color: gymStyle(booking.gymName).fg,
                          }
                        : {}),
                    }}
                  >
                    {showGym ? (
                      <span className="block font-semibold uppercase tracking-[0.08em]">
                        {booking.gymName}
                      </span>
                    ) : null}
                    <span className="block font-semibold">{booking.teamName}</span>
                    <span className="opacity-80">{formatRange(start, end)}</span>
                  </button>
                );
              })}
          </div>
          );
        })}
      </div>
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
          const dayBlocks = blocks.filter((item) => blockTouchesDay(item, day));
          const inMonth = isSameMonth(day, anchor);
          const dayClosed = isDayClosed(blocks, day, showGym, gymCount);
          const closedLabel = closedBlocksOn(blocks, day)[0];
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
                {dayBlocks.slice(0, 2).map((block) => (
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
                    {showGym ? `${block.gymName} · ${block.title}` : block.title}
                  </button>
                ))}
                {dayBookings.slice(0, 3).map((booking) => (
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
                      ? `${booking.gymName} · ${booking.teamName}`
                      : booking.teamName}
                  </button>
                ))}
                {dayBookings.length + dayBlocks.length > 5 ? (
                  <p className="px-1 text-[10px] text-muted-foreground">More…</p>
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
