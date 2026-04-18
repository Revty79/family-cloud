import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { choreAssignment } from "@/db/schema";
import { getSession } from "@/lib/auth-session";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const assignmentId = params.id;

  const [deleted] = await db
    .delete(choreAssignment)
    .where(eq(choreAssignment.id, assignmentId))
    .returning({ id: choreAssignment.id });

  if (!deleted) {
    return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
