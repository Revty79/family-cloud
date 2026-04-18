import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { choreAssignment, choreItem } from "@/db/schema";
import type { ChoreAssignment, ChoreItem } from "@/lib/chore-calendar";
import { getSession } from "@/lib/auth-session";

function toChoreItem(row: typeof choreItem.$inferSelect): ChoreItem {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
  };
}

function toChoreAssignment(
  row: typeof choreAssignment.$inferSelect,
): ChoreAssignment {
  return {
    id: row.id,
    date: row.date,
    choreTitle: row.choreTitle,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [chores, assignments] = await Promise.all([
    db.select().from(choreItem).orderBy(asc(choreItem.title), asc(choreItem.createdAt)),
    db
      .select()
      .from(choreAssignment)
      .orderBy(asc(choreAssignment.date), asc(choreAssignment.createdAt)),
  ]);

  return NextResponse.json({
    chores: chores.map(toChoreItem),
    assignments: assignments.map(toChoreAssignment),
  });
}
