import { addWeeks, endOfWeek, format, parseISO, startOfWeek } from "date-fns";

export function getWeekRange(date: Date) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(date, { weekStartsOn: 1 });

  return { weekStart, weekEndDate };
}

export function toDateInputValue(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function fromDateInputValue(value: string) {
  return parseISO(value);
}

export function formatWeekLabel(
  weekStart: string | Date,
  weekEndDate?: string | Date,
) {
  const start = typeof weekStart === "string" ? new Date(weekStart) : weekStart;
  const end = weekEndDate
    ? typeof weekEndDate === "string"
      ? new Date(weekEndDate)
      : weekEndDate
    : addWeeks(start, 1);

  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

export function formatShortDate(date: string | Date) {
  return format(
    typeof date === "string" ? new Date(date) : date,
    "MMM d, yyyy",
  );
}
