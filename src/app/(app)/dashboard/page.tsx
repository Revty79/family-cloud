import {
  CalendarDays,
  Lock,
  MessagesSquare,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";

const cards = [
  {
    title: "Calendars",
    detail:
      "Choose between family, chore, and personal calendar spaces.",
    icon: CalendarDays,
    href: "/calendars",
    cta: "Open calendars",
  },
  {
    title: "Family files",
    detail:
      "Keep shared documents, photos, and household records in one place.",
    icon: UploadCloud,
    href: "/files",
    cta: "Open files",
  },
  {
    title: "Communication center",
    detail:
      "Post updates to the family billboard and chat together in one place.",
    icon: MessagesSquare,
    href: "/communication",
    cta: "Open communication",
  },
  {
    title: "Privacy controls",
    detail:
      "Role and access settings will expand as multi-member features are added.",
    icon: Lock,
    href: null,
    cta: "Coming soon",
  },
];

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-[#d7c8b2] bg-gradient-to-r from-[#f9ecda] to-[#dce8e5] p-7 sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#ccbba2] bg-[#fff4e4] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#54665d]">
          <Sparkles className="h-3.5 w-3.5 text-accent-strong" />
          Dashboard
        </p>
        <h1 className="mt-4 font-display text-4xl tracking-tight text-[#21322c]">
          You&apos;re signed in
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#3f5048]">
          This is your protected area. Family features can be added here next.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.title}
            className="fc-card rounded-xl border border-[#d6c8b2] p-5"
          >
            <card.icon className="h-6 w-6 text-sage" />
            <h2 className="mt-4 font-display text-2xl tracking-tight text-[#23362f]">
              {card.title}
            </h2>
            <p className="mt-3 text-sm leading-7 fc-text-muted">{card.detail}</p>
            {card.href ? (
              <Link
                href={card.href}
                className="mt-4 inline-flex rounded-full border border-[#cbbba4] bg-[#f7eddd] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#42534b] transition hover:border-[#b8a183] hover:text-[#2b3b34]"
              >
                {card.cta}
              </Link>
            ) : (
              <span className="mt-4 inline-flex rounded-full border border-[#d2c3ad] bg-[#f5ebdc] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-[#6f6d66]">
                {card.cta}
              </span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
