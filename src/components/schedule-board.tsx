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
import { BookingDialog, durationFromRange, type BookingDraft } from "@/components/booking-dialog";
import { EventDetail } from "@/components/event-detail";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  formatMonthLabel,
  formatRange,
  formatWeekLabel,
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
};

export type BoardBooking = {
  id: string;
  gymId: string;
  gymName: string;
  userId: string;
  userName: string;
  startAt: string;
  endAt: string;
  notes: string | null;
};

export type BoardBlock = {
  id: string;
  gymId: string;
  gymName: string;
  title: string;
  kind: "GAME" | "EVENT" | "MAINTENANCE";
  startAt: string;
  endAt: string;
};

const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
const HOUR_PX = 56;

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
  bookings,
  blocks,
  view,
  gymId,
  date,
  currentUserId,
  isAdmin,
}: {
  gyms: GymOption[];
  coaches: { id: string; name: string }[];
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
    setDraft({
      gymId: gymId === "all" ? gyms[0]?.id ?? "" : gymId,
      date: toDateInput(start),
      startTime: toTimeInput(start),
      durationMinutes: 60,
    });
  };

  const selectedGym = gyms.find((gym) => gym.id === gymId);
  const showingAll = gymId === "all";
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
                startTime: "17:00",
                durationMinutes: 60,
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
          </>
        )}
      </div>

      {view === "week" ? (
        <WeekGrid
          days={weekDays}
          bookings={bookings}
          blocks={blocks}
          showGym={showingAll}
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
              isToday(day) && "bg-primary/6"
            )}
          >
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {format(day, "MMM")}
            </p>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {format(day, "EEE")}
            </p>
            <p
              className={cn(
                "font-heading text-xl font-semibold",
                isToday(day) && "text-primary"
              )}
            >
              {format(day, "d")}
            </p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {format(day, "MMM")}
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
        {days.map((day) => (
          <div key={`col-${day.toISOString()}`} className="relative border-l">
            {HOURS.map((hour) => (
              <button
                key={hour}
                type="button"
                onClick={() => onSlot(day, hour)}
                className="block w-full border-b hover:bg-primary/5"
                style={{ height: HOUR_PX }}
                aria-label={`Book ${format(day, "MMM d")} at ${format(new Date(2000, 0, 1, hour), "h a")}`}
              />
            ))}
            {blocks
              .filter((block) =>
                isSameDay(new Date(block.startAt), day) ||
                (new Date(block.startAt) < addDays(day, 1) && new Date(block.endAt) > day)
              )
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
                      !showGym && block.kind === "GAME" && "bg-game text-game-foreground",
                      !showGym && block.kind !== "GAME" && "bg-event text-event-foreground"
                    )}
                    style={{
                      top,
                      height,
                      ...(showGym
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
            {bookings
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
                    <span className="block font-semibold">{booking.userName}</span>
                    <span className="opacity-80">{formatRange(start, end)}</span>
                  </button>
                );
              })}
          </div>
        ))}
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
          const dayBlocks = blocks.filter(
            (item) =>
              isSameDay(new Date(item.startAt), day) ||
              (new Date(item.startAt) < addDays(day, 1) && new Date(item.endAt) > day)
          );
          const inMonth = isSameMonth(day, anchor);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-28 border-b border-l p-1.5 sm:min-h-32",
                !inMonth && "bg-muted/30",
                isToday(day) && "bg-primary/5"
              )}
            >
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {format(day, "MMM")}
              </p>
              <button
                type="button"
                onClick={() => onDay(day)}
                className={cn(
                  "mb-0.5 flex size-7 items-center justify-center rounded-full text-sm font-medium",
                  isToday(day) && "bg-primary text-primary-foreground",
                  !inMonth && "text-muted-foreground"
                )}
              >
                {format(day, "d")}
              </button>
              <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {format(day, "MMM")}
              </p>
              <div className="space-y-1">
                {dayBlocks.slice(0, 2).map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => onBlock(block)}
                    className={cn(
                      "block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium",
                      !showGym && block.kind === "GAME" && "bg-game text-game-foreground",
                      !showGym && block.kind !== "GAME" && "bg-event text-event-foreground"
                    )}
                    style={
                      showGym
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
                    {showGym ? `${booking.gymName} · ${booking.userName}` : booking.userName}
                  </button>
                ))}
                {dayBookings.length + dayBlocks.length > 5 ? (
                  <p className="px-1 text-[10px] text-muted-foreground">More…</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
