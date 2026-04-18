import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { calendarEvent } from "@/db/schema";
import {
  type CalendarCustomEvent,
  isCalendarDateKey,
  isCalendarTimeValue,
  isCustomCalendarEventType,
} from "@/lib/calendar";
import { getSession } from "@/lib/auth-session";

type CreateCalendarEventBody = {
  title?: unknown;
  date?: unknown;
  type?: unknown;
  time?: unknown;
};

function toCalendarCustomEvent(
  row: typeof calendarEvent.$inferSelect,
): CalendarCustomEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    type: row.type as CalendarCustomEvent["type"],
    time: row.time ?? undefined,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(calendarEvent)
    .where(eq(calendarEvent.userId, session.user.id))
    .orderBy(
      asc(calendarEvent.date),
      asc(calendarEvent.time),
      asc(calendarEvent.createdAt),
    );

  return NextResponse.json({
    events: rows.map(toCalendarCustomEvent),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: CreateCalendarEventBody;
  try {
    payload = (await request.json()) as CreateCalendarEventBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const date = typeof payload.date === "string" ? payload.date.trim() : "";
  const rawType = typeof payload.type === "string" ? payload.type.trim() : "";
  const rawTime = typeof payload.time === "string" ? payload.time.trim() : "";
  const time = rawTime.length > 0 ? rawTime : undefined;

  if (!title) {
    return NextResponse.json(
      { error: "Title is required." },
      { status: 400 },
    );
  }

  if (!isCalendarDateKey(date)) {
    return NextResponse.json(
      { error: "Date must be in YYYY-MM-DD format." },
      { status: 400 },
    );
  }

  if (!isCustomCalendarEventType(rawType)) {
    return NextResponse.json(
      { error: "Event type is invalid." },
      { status: 400 },
    );
  }

  if (time && !isCalendarTimeValue(time)) {
    return NextResponse.json(
      { error: "Time must be in HH:mm format." },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(calendarEvent)
    .values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      title,
      date,
      time,
      type: rawType,
    })
    .returning();

  return NextResponse.json({
    event: toCalendarCustomEvent(created),
  });
}
