import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import {
  isWebPushConfigured,
  sendPushNotificationToUser,
} from "@/lib/push-notifications";

export async function POST() {
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

  await sendPushNotificationToUser(session.user.id, {
    title: "Family Cloud",
    body: "Push notifications are active on this device.",
    url: "/dashboard",
    tag: "family-cloud-test",
  });

  return NextResponse.json({ success: true });
}
