import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { pushSubscription } from "@/db/schema";
import { getSession } from "@/lib/auth-session";
import {
  removePushSubscriptionForUser,
  isWebPushConfigured,
} from "@/lib/push-notifications";
import {
  parsePushSubscriptionDeletePayload,
  parsePushSubscriptionPayload,
} from "@/lib/push-subscriptions";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: "Web push is not configured on the server." },
      { status: 503 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const subscription = parsePushSubscriptionPayload(payload);
  if (!subscription) {
    return NextResponse.json(
      { error: "Invalid subscription payload." },
      { status: 400 },
    );
  }

  const userAgent = request.headers.get("user-agent");

  const existing = await db
    .select({ id: pushSubscription.id })
    .from(pushSubscription)
    .where(eq(pushSubscription.endpoint, subscription.endpoint))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(pushSubscription)
      .set({
        userId: session.user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        updatedAt: new Date(),
      })
      .where(eq(pushSubscription.id, existing[0].id));
  } else {
    await db.insert(pushSubscription).values({
      id: crypto.randomUUID(),
      userId: session.user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const deletePayload = parsePushSubscriptionDeletePayload(payload);
  if (!deletePayload) {
    return NextResponse.json(
      { error: "Endpoint is required." },
      { status: 400 },
    );
  }

  await removePushSubscriptionForUser({
    userId: session.user.id,
    endpoint: deletePayload.endpoint,
  });

  return NextResponse.json({ success: true });
}
