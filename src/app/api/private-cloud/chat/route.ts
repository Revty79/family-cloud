import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { privateCloudChatMessage } from "@/db/schema";
import { getSession } from "@/lib/auth-session";
import {
  isValidPrivateChatMessage,
  maxPrivateChatMessageLength,
  normalizeSingleLineText,
  type PrivateCloudChatMessageItem,
} from "@/lib/private-cloud";

type CreatePrivateChatMessageBody = {
  message?: unknown;
};

function toPrivateChatMessageItem(
  row: typeof privateCloudChatMessage.$inferSelect,
): PrivateCloudChatMessageItem {
  return {
    id: row.id,
    message: row.message,
    sentByName: row.sentByName,
    sentByUserId: row.sentByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(privateCloudChatMessage)
    .where(eq(privateCloudChatMessage.ownerUserId, session.user.id))
    .orderBy(asc(privateCloudChatMessage.createdAt));

  return NextResponse.json({
    messages: rows.map(toPrivateChatMessageItem),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: CreatePrivateChatMessageBody;
  try {
    payload = (await request.json()) as CreatePrivateChatMessageBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const messageRaw = typeof payload.message === "string" ? payload.message : "";
  const message = normalizeSingleLineText(messageRaw);

  if (!isValidPrivateChatMessage(message)) {
    return NextResponse.json(
      {
        error: `Message must be 1-${maxPrivateChatMessageLength} characters.`,
      },
      { status: 400 },
    );
  }

  const sentByName =
    normalizeSingleLineText(session.user.name ?? "") ||
    session.user.email ||
    "Private user";

  const [created] = await db
    .insert(privateCloudChatMessage)
    .values({
      id: crypto.randomUUID(),
      ownerUserId: session.user.id,
      sentByUserId: session.user.id,
      sentByName,
      message,
    })
    .returning();

  return NextResponse.json({
    message: toPrivateChatMessageItem(created),
  });
}
