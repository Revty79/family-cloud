import { Lock } from "lucide-react";
import Link from "next/link";

export default function PersonalCalendarPage() {
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
        <span>Personal</span>
      </div>

      <article className="fc-card rounded-xl border border-[#d6c8b2] p-5 sm:p-6">
        <p className="fc-pill">
          <Lock className="h-4 w-4 text-sage" />
          Personal planning
        </p>
        <h2 className="mt-3 font-display text-3xl tracking-tight text-[#23362f]">
          Personal calendar
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 fc-text-muted">
          This space is ready for private events and personal scheduling rules
          once we implement your private calendar workflow.
        </p>
      </article>
    </section>
  );
}
