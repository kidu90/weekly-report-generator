export function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function endOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

/** Monday–Sunday week containing the given date. */
export function getWeekRange(weekDate: Date): { weekStart: Date; weekEndDate: Date } {
  const date = startOfDay(weekDate);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diffToMonday);

  const weekEndDate = endOfDay(new Date(weekStart));
  weekEndDate.setDate(weekStart.getDate() + 6);

  return { weekStart, weekEndDate };
}

export function weeksInRange(from: Date, to: Date): Array<{ weekStart: Date; weekEndDate: Date }> {
  const weeks: Array<{ weekStart: Date; weekEndDate: Date }> = [];
  let cursor = getWeekRange(from).weekStart;
  const end = startOfDay(to);

  while (cursor <= end) {
    const range = getWeekRange(cursor);
    weeks.push(range);
    cursor = new Date(range.weekStart);
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

export function isSameWeek(
  a: { weekStart: Date; weekEndDate: Date },
  b: { weekStart: Date; weekEndDate: Date }
): boolean {
  return a.weekStart.getTime() === b.weekStart.getTime();
}

export function dateWithinWeek(date: Date, weekStart: Date, weekEndDate: Date): boolean {
  const value = startOfDay(date).getTime();
  return value >= startOfDay(weekStart).getTime() && value <= startOfDay(weekEndDate).getTime();
}
