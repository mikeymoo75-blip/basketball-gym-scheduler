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
import { BARN_BOOKING_MESSAGE, firstBookableGym, isBarnGym } from "@/lib/barn";
import { SCHOOL_IN_SESSION_TITLE } from "@/lib/mp-school-calendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
