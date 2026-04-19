import "server-only";
import { and, eq, ne } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/db";
import { pushSubscription } from "@/db/schema";

type PushMessageInput = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type PushDeliveryRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

let isWebPushInitialized = false;

function getWebPushEnv() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ?? "";
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY ?? "";
  const subject = process.env.WEB_PUSH_SUBJECT ?? "";

  if (!publicKey || !privateKey || !subject) {
    return null;
  }

  return {
    publicKey,
    privateKey,
    subject,
  };
}

export function isWebPushConfigured() {
  return Boolean(getWebPushEnv());
}

function ensureWebPushInitialized() {
  const env = getWebPushEnv();
  if (!env) {
    return false;
  }

  if (!isWebPushInitialized) {
    webpush.setVapidDetails(env.subject, env.publicKey, env.privateKey);
    isWebPushInitialized = true;
  }

  return true;
}

function toNotificationPayload(input: PushMessageInput) {
  return JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url ?? "/dashboard",
    tag: input.tag ?? "family-cloud-update",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  });
}

function isSubscriptionGoneError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

async function sendToRows(rows: PushDeliveryRow[], input: PushMessageInput) {
  if (rows.length === 0 || !ensureWebPushInitialized()) {
    return;
  }

  const payload = toNotificationPayload(input);

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          },
          payload,
        );
      } catch (error) {
        if (isSubscriptionGoneError(error)) {
          try {
            await db
              .delete(pushSubscription)
              .where(eq(pushSubscription.id, row.id));
          } catch (deleteError) {
            console.error("Failed removing expired push subscription", deleteError);
          }
          return;
        }

        console.error("Push delivery failed", error);
      }
    }),
  );
}

export async function sendPushNotificationToUser(
  userId: string,
  input: PushMessageInput,
) {
  if (!isWebPushConfigured()) {
    return;
  }

  const rows = await db
    .select({
      id: pushSubscription.id,
      endpoint: pushSubscription.endpoint,
      p256dh: pushSubscription.p256dh,
      auth: pushSubscription.auth,
    })
    .from(pushSubscription)
    .where(eq(pushSubscription.userId, userId));

  await sendToRows(rows, input);
}

export async function sendPushNotificationToFamily(input: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  excludeUserId?: string;
}) {
  if (!isWebPushConfigured()) {
    return;
  }

  const rows = input.excludeUserId
    ? await db
        .select({
          id: pushSubscription.id,
          endpoint: pushSubscription.endpoint,
          p256dh: pushSubscription.p256dh,
          auth: pushSubscription.auth,
        })
        .from(pushSubscription)
        .where(ne(pushSubscription.userId, input.excludeUserId))
    : await db
        .select({
          id: pushSubscription.id,
          endpoint: pushSubscription.endpoint,
          p256dh: pushSubscription.p256dh,
          auth: pushSubscription.auth,
        })
        .from(pushSubscription);

  await sendToRows(rows, input);
}

export async function removePushSubscriptionForUser(args: {
  userId: string;
  endpoint: string;
}) {
  await db
    .delete(pushSubscription)
    .where(
      and(
        eq(pushSubscription.userId, args.userId),
        eq(pushSubscription.endpoint, args.endpoint),
      ),
    );
}
