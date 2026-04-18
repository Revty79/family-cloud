import Link from "next/link";
import { asc } from "drizzle-orm";
import { ChoreCalendar } from "@/components/dashboard/chore-calendar";
import { db } from "@/db";
import { choreAssignment, choreItem } from "@/db/schema";
import type { ChoreAssignment, ChoreItem } from "@/lib/chore-calendar";

export default async function ChoreCalendarPage() {
  const [choreRows, assignmentRows] = await Promise.all([
    db
      .select({
        id: choreItem.id,
        title: choreItem.title,
        createdAt: choreItem.createdAt,
      })
      .from(choreItem)
      .orderBy(asc(choreItem.title), asc(choreItem.createdAt)),
    db
      .select({
        id: choreAssignment.id,
        date: choreAssignment.date,
        choreTitle: choreAssignment.choreTitle,
        createdAt: choreAssignment.createdAt,
      })
      .from(choreAssignment)
      .orderBy(asc(choreAssignment.date), asc(choreAssignment.createdAt)),
  ]);

  const initialChores: ChoreItem[] = choreRows.map((chore) => ({
    id: chore.id,
    title: chore.title,
    createdAt: chore.createdAt.toISOString(),
  }));

  const initialAssignments: ChoreAssignment[] = assignmentRows.map(
    (assignment) => ({
      id: assignment.id,
      date: assignment.date,
      choreTitle: assignment.choreTitle,
      createdAt: assignment.createdAt.toISOString(),
    }),
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.1em] text-[#4e5f56]">
        <Link
          href="/dashboard"
          className="rounded-full border border-[#d2c2ac] bg-[#f4e9d7] px-2.5 py-1 transition hover:border-[#bfab8f] hover:text-[#31433a]"
        >
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href="/calendars"
          className="rounded-full border border-[#d2c2ac] bg-[#f4e9d7] px-2.5 py-1 transition hover:border-[#bfab8f] hover:text-[#31433a]"
        >
          Calendars
        </Link>
        <span>/</span>
        <span>Chore</span>
      </div>

      <ChoreCalendar
        initialChores={initialChores}
        initialAssignments={initialAssignments}
      />
    </section>
  );
}
