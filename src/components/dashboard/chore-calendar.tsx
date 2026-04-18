"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Dices,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  buildCalendarCells,
  formatDateKey,
  isValidChoreTitle,
  normalizeChoreTitle,
  parseDateKey,
  type ChoreAssignment,
  type ChoreItem,
} from "@/lib/chore-calendar";
import { isCalendarDateKey } from "@/lib/calendar";

type ChoreCalendarProps = {
  initialChores: ChoreItem[];
  initialAssignments: ChoreAssignment[];
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parseApiError(payload: unknown) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return "Something went wrong. Please try again.";
}

async function parseJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function sortChoresByTitle(chores: ChoreItem[]) {
  return [...chores].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
}

function sortAssignmentsByDate(assignments: ChoreAssignment[]) {
  return [...assignments].sort((a, b) => a.date.localeCompare(b.date));
}

export function ChoreCalendar({
  initialChores,
  initialAssignments,
}: ChoreCalendarProps) {
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(formatDateKey(today));
  const [chores, setChores] = useState(() => sortChoresByTitle(initialChores));
  const [assignments, setAssignments] = useState(() =>
    sortAssignmentsByDate(initialAssignments),
  );
  const [newChoreTitle, setNewChoreTitle] = useState("");
  const [isAssigningRandom, setIsAssigningRandom] = useState(false);
  const [isSavingChore, setIsSavingChore] = useState(false);
  const [pendingRemoveChoreId, setPendingRemoveChoreId] = useState<string | null>(
    null,
  );
  const [pendingRemoveAssignmentId, setPendingRemoveAssignmentId] = useState<
    string | null
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const visibleMonthYear = visibleMonth.getFullYear();
  const visibleMonthIndex = visibleMonth.getMonth();

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(visibleMonth),
    [visibleMonth],
  );

  const fullDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  const selectedDateLabel = useMemo(() => {
    const parsed = parseDateKey(selectedDate);
    return parsed ? fullDateFormatter.format(parsed) : selectedDate;
  }, [fullDateFormatter, selectedDate]);

  const calendarCells = useMemo(
    () => buildCalendarCells(visibleMonthYear, visibleMonthIndex),
    [visibleMonthIndex, visibleMonthYear],
  );

  const assignmentByDate = useMemo(() => {
    const map = new Map<string, ChoreAssignment>();
    for (const assignment of assignments) {
      map.set(assignment.date, assignment);
    }
    return map;
  }, [assignments]);

  const selectedAssignment = assignmentByDate.get(selectedDate) ?? null;

  const selectedMonthAssignments = useMemo(
    () =>
      assignments.filter((assignment) => {
        const date = parseDateKey(assignment.date);
        return (
          date &&
          date.getFullYear() === visibleMonthYear &&
          date.getMonth() === visibleMonthIndex
        );
      }),
    [assignments, visibleMonthIndex, visibleMonthYear],
  );

  const handleShiftMonth = (offset: number) => {
    setVisibleMonth(
      (previous) =>
        new Date(previous.getFullYear(), previous.getMonth() + offset, 1),
    );
  };

  const handleSelectCalendarDay = (day: number) => {
    const date = new Date(visibleMonthYear, visibleMonthIndex, day);
    const dateKey = formatDateKey(date);
    setSelectedDate(dateKey);
  };

  const upsertAssignment = (nextAssignment: ChoreAssignment) => {
    setAssignments((previous) => {
      const filtered = previous.filter(
        (assignment) => assignment.date !== nextAssignment.date,
      );
      return sortAssignmentsByDate([...filtered, nextAssignment]);
    });
  };

  const handleAssignRandom = async () => {
    if (!isCalendarDateKey(selectedDate)) {
      setActionError("Please select a valid date first.");
      return;
    }

    setActionError(null);
    setIsAssigningRandom(true);

    try {
      const response = await fetch("/api/chore-calendar/assignments/random", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: selectedDate,
        }),
      });

      const payload = await parseJson(response);
      if (!response.ok) {
        setActionError(parseApiError(payload));
        return;
      }

      const assignment =
        payload &&
        typeof payload === "object" &&
        "assignment" in payload &&
        payload.assignment &&
        typeof payload.assignment === "object"
          ? (payload.assignment as ChoreAssignment)
          : null;

      if (!assignment || typeof assignment.date !== "string") {
        setActionError("Assignment was saved, but response was invalid.");
        return;
      }

      upsertAssignment(assignment);
    } catch {
      setActionError("Could not assign a random chore right now.");
    } finally {
      setIsAssigningRandom(false);
    }
  };

  const handleRemoveAssignment = async () => {
    if (!selectedAssignment) {
      return;
    }

    setActionError(null);
    setPendingRemoveAssignmentId(selectedAssignment.id);

    try {
      const response = await fetch(
        `/api/chore-calendar/assignments/${selectedAssignment.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const payload = await parseJson(response);
        setActionError(parseApiError(payload));
        return;
      }

      setAssignments((previous) =>
        previous.filter((assignment) => assignment.id !== selectedAssignment.id),
      );
    } catch {
      setActionError("Could not clear that assignment right now.");
    } finally {
      setPendingRemoveAssignmentId(null);
    }
  };

  const handleAddChore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const title = normalizeChoreTitle(newChoreTitle);
    if (!isValidChoreTitle(title)) {
      setActionError("Chore name must be 2-80 characters.");
      return;
    }

    setActionError(null);
    setIsSavingChore(true);

    try {
      const response = await fetch("/api/chore-calendar/chores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      const payload = await parseJson(response);
      if (!response.ok) {
        setActionError(parseApiError(payload));
        return;
      }

      const chore =
        payload &&
        typeof payload === "object" &&
        "chore" in payload &&
        payload.chore &&
        typeof payload.chore === "object"
          ? (payload.chore as ChoreItem)
          : null;

      if (!chore || typeof chore.title !== "string") {
        setActionError("Chore was saved, but response was invalid.");
        return;
      }

      setChores((previous) => sortChoresByTitle([...previous, chore]));
      setNewChoreTitle("");
    } catch {
      setActionError("Could not add this chore right now.");
    } finally {
      setIsSavingChore(false);
    }
  };

  const handleRemoveChore = async (choreId: string) => {
    setActionError(null);
    setPendingRemoveChoreId(choreId);

    try {
      const response = await fetch(`/api/chore-calendar/chores/${choreId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await parseJson(response);
        setActionError(parseApiError(payload));
        return;
      }

      setChores((previous) => previous.filter((chore) => chore.id !== choreId));
    } catch {
      setActionError("Could not remove this chore right now.");
    } finally {
      setPendingRemoveChoreId(null);
    }
  };

  return (
    <article className="fc-card rounded-xl border border-[#d6c8b2] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="fc-pill">
            <CalendarDays className="h-4 w-4 text-sage" />
            Chore planning
          </p>
          <h2 className="mt-3 font-display text-3xl tracking-tight text-[#23362f]">
            Chore calendar
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 fc-text-muted">
            Pick a day, then assign a random chore from your chore list.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[#d2c1a8] bg-[#f9efdf] px-2 py-1.5">
          <button
            type="button"
            onClick={() => handleShiftMonth(-1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#cdbca5] bg-[#fff8ef] text-[#4d5d55] transition hover:border-[#bda98d] hover:text-[#2f4138]"
            aria-label="View previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="min-w-32 text-center text-xs font-semibold uppercase tracking-[0.12em] text-[#4b5b54]">
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={() => handleShiftMonth(1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#cdbca5] bg-[#fff8ef] text-[#4d5d55] transition hover:border-[#bda98d] hover:text-[#2f4138]"
            aria-label="View next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-[#d8c9b3] bg-[#fffdf8]">
            <div className="grid grid-cols-7 border-b border-[#d9cab2] bg-[#f4e8d7]">
              {weekdays.map((day) => (
                <p
                  key={day}
                  className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.08em] text-[#5a6d63]"
                >
                  {day}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-[#d9cab2]">
              {calendarCells.map((day, index) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="min-h-28 bg-[#f8f1e6] p-2"
                    />
                  );
                }

                const dateKey = formatDateKey(
                  new Date(visibleMonthYear, visibleMonthIndex, day),
                );
                const assignment = assignmentByDate.get(dateKey);
                const isToday = dateKey === formatDateKey(today);
                const isSelected = dateKey === selectedDate;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => handleSelectCalendarDay(day)}
                    className={cn(
                      "min-h-28 bg-[#fffaf2] p-2 text-left transition hover:bg-[#fcf0de]",
                      isSelected && "bg-[#f6ead8]",
                    )}
                  >
                    <p
                      className={cn(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold",
                        isToday
                          ? "bg-[#8f4325] text-white"
                          : "text-[#46574f]",
                      )}
                    >
                      {day}
                    </p>
                    {assignment ? (
                      <p
                        className="mt-2 truncate rounded-md bg-[#e6f2ec] px-1.5 py-1 text-[10px] font-semibold text-[#2c4f42]"
                        title={assignment.choreTitle}
                      >
                        {assignment.choreTitle}
                      </p>
                    ) : (
                      <p className="mt-2 text-[10px] font-semibold text-[#7b837e]">
                        No chore assigned
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-[#d4c4ae] bg-[#fff8ef] p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4e5f56]">
              This month&apos;s assignments
            </p>
            {selectedMonthAssignments.length > 0 ? (
              <div className="mt-2 space-y-2">
                {selectedMonthAssignments.map((assignment) => (
                  <article
                    key={assignment.id}
                    className="rounded-md border border-[#d8c8b2] bg-[#fffdf8] px-2.5 py-2"
                  >
                    <p className="text-sm font-semibold text-[#2e4038]">
                      {assignment.choreTitle}
                    </p>
                    <p className="text-xs fc-text-muted">
                      {fullDateFormatter.format(parseDateKey(assignment.date)!)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm fc-text-muted">
                No assignments for this month yet.
              </p>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-[#d4c4ae] bg-[#fff8ef] p-3">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#4e5f56]">
              <Dices className="h-4 w-4 text-accent" />
              Assign random
            </p>
            <label className="mt-3 block">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#607169]">
                Selected day
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="mt-1 w-full rounded-md border border-[#cbbba4] bg-[#fffdf8] px-2.5 py-2 text-sm text-[#2f4038] outline-none transition focus:border-[#9e8569] focus:ring-2 focus:ring-[#d9c3a6]"
                required
              />
            </label>

            <p className="mt-2 text-xs fc-text-muted">
              {selectedAssignment
                ? `${selectedDateLabel}: ${selectedAssignment.choreTitle}`
                : `${selectedDateLabel}: no chore assigned`}
            </p>

            <button
              type="button"
              onClick={handleAssignRandom}
              disabled={isAssigningRandom}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#a08062] bg-[#b86642] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#9d5737] disabled:opacity-70"
            >
              <Dices className="h-4 w-4" />
              {isAssigningRandom ? "Assigning..." : "Assign random chore"}
            </button>

            {selectedAssignment ? (
              <button
                type="button"
                onClick={handleRemoveAssignment}
                disabled={pendingRemoveAssignmentId === selectedAssignment.id}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#d2b7a1] bg-[#fff3e8] px-3 py-2 text-sm font-semibold text-[#7a4730] transition hover:border-[#bf967a] hover:text-[#5f3422] disabled:opacity-70"
              >
                <Trash2 className="h-4 w-4" />
                {pendingRemoveAssignmentId === selectedAssignment.id
                  ? "Clearing..."
                  : "Clear assignment"}
              </button>
            ) : null}
          </div>

          <div className="rounded-lg border border-[#d4c4ae] bg-[#fff8ef] p-3">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#4e5f56]">
              <Plus className="h-4 w-4 text-accent" />
              Chore pool
            </p>
            <form className="mt-3 space-y-2" onSubmit={handleAddChore}>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#607169]">
                  New chore
                </span>
                <input
                  value={newChoreTitle}
                  onChange={(event) => setNewChoreTitle(event.target.value)}
                  placeholder="Take out recycling"
                  className="mt-1 w-full rounded-md border border-[#cbbba4] bg-[#fffdf8] px-2.5 py-2 text-sm text-[#2f4038] outline-none transition focus:border-[#9e8569] focus:ring-2 focus:ring-[#d9c3a6]"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={isSavingChore}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#a08062] bg-[#b86642] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#9d5737] disabled:opacity-70"
              >
                <Plus className="h-4 w-4" />
                {isSavingChore ? "Adding..." : "Add chore"}
              </button>
            </form>

            {chores.length > 0 ? (
              <div className="mt-3 space-y-2">
                {chores.map((chore) => (
                  <article
                    key={chore.id}
                    className="rounded-md border border-[#d8c8b2] bg-[#fffdf8] px-2.5 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#2e4038]">
                        {chore.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveChore(chore.id)}
                        disabled={pendingRemoveChoreId === chore.id}
                        className="inline-flex items-center gap-1 rounded-md border border-[#d2b7a1] bg-[#fff3e8] px-2 py-1 text-[11px] font-semibold text-[#7a4730] transition hover:border-[#bf967a] hover:text-[#5f3422] disabled:opacity-70"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {pendingRemoveChoreId === chore.id ? "..." : "Remove"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-[#d4c4ae] bg-[#fff8ef] px-3 py-2 text-sm fc-text-muted">
                Add chores first, then randomize assignments.
              </p>
            )}
          </div>

          {actionError ? (
            <p className="rounded-lg border border-[#d8bea5] bg-[#fff0e3] px-3 py-2 text-xs font-semibold text-[#8f4325]">
              {actionError}
            </p>
          ) : null}

          <p className="inline-flex items-start gap-2 rounded-lg border border-[#d8c8b2] bg-[#fff8ef] px-3 py-2 text-xs leading-6 text-[#5a6a62]">
            <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#7a8a83]" />
            Random assignment picks from your current chore pool and sets one chore
            per day.
          </p>
        </aside>
      </div>
    </article>
  );
}
