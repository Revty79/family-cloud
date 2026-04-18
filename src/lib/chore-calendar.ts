import { isCalendarDateKey } from "./calendar";

export type ChoreItem = {
  id: string;
  title: string;
  createdAt: string;
};

export type ChoreAssignment = {
  id: string;
  date: string;
  choreTitle: string;
  createdAt: string;
};

export function isValidChoreTitle(value: string) {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 80;
}

export function normalizeChoreTitle(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function parseDateKey(dateKey: string) {
  if (!isCalendarDateKey(dateKey)) {
    return null;
  }

  const [yearString, monthString, dayString] = dateKey.split("-");
  return new Date(
    Number(yearString),
    Number(monthString) - 1,
    Number(dayString),
  );
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildCalendarCells(year: number, month: number): Array<number | null> {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Array<number | null> = Array.from(
    { length: firstWeekday },
    () => null,
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}
