import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { PrivateCloudChatCenter } from "@/components/dashboard/private-cloud-chat-center";
import { db } from "@/db";
import { privateCloudChatMessage } from "@/db/schema";
import type { PrivateCloudChatMessageItem } from "@/lib/private-cloud";
import { requireSession } from "@/lib/auth-session";

export default async function PrivateCloudChatPage() {
  const session = await requireSession("/login?next=/private-cloud/chat");

  const chatRows = await db
    .select({
      id: privateCloudChatMessage.id,
      message: privateCloudChatMessage.message,
      sentByName: privateCloudChatMessage.sentByName,
      sentByUserId: privateCloudChatMessage.sentByUserId,
      createdAt: privateCloudChatMessage.createdAt,
    })
    .from(privateCloudChatMessage)
    .where(eq(privateCloudChatMessage.ownerUserId, session.user.id))
    .orderBy(asc(privateCloudChatMessage.createdAt));

  const initialChatMessages: PrivateCloudChatMessageItem[] = chatRows.map(
    (message) => ({
      id: message.id,
      message: message.message,
      sentByName: message.sentByName,
      sentByUserId: message.sentByUserId,
      createdAt: message.createdAt.toISOString(),
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
          href="/private-cloud"
          className="rounded-full border border-[#d2c2ac] bg-[#f4e9d7] px-2.5 py-1 transition hover:border-[#bfab8f] hover:text-[#31433a]"
        >
          Private cloud
        </Link>
        <span>/</span>
        <span>Private chat</span>
      </div>

      <PrivateCloudChatCenter
        initialMessages={initialChatMessages}
        currentUserId={session.user.id}
      />
    </section>
  );
}
