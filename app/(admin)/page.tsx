"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useApi } from "@/lib/api";
import { Card, ErrorNote, PageHeader, Spinner, StatCard } from "@/components/ui";
import { humanize, naira, number } from "@/lib/format";
import type { Stats } from "@/lib/types";
import { useSession } from "@/components/session";

function JobsChart({ perDay }: { perDay: Stats["jobs"]["perDay"] }) {
  // The backend zero-fills the series, so every day has a bar slot.
  const days = perDay.map(({ date, count }) => ({ day: date, count }));
  const max = Math.max(1, ...days.map((entry) => entry.count));

  return (
    <div>
      <div className="flex h-40 items-end gap-1.5" role="img" aria-label={`Jobs created per day over the last 14 days, peak ${max}`}>
        {days.map(({ day, count }) => (
          <div key={day} className="group relative flex h-full flex-1 flex-col justify-end">
            <div className="rounded-t bg-primary/80 transition-colors group-hover:bg-primary" style={{ height: `${(count / max) * 100}%`, minHeight: count ? 4 : 2, opacity: count ? 1 : 0.25 }} />
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded bg-ink px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">{count}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{days[0]?.day.slice(5)}</span>
        <span>Jobs created / day</span>
        <span>{days[days.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const admin = useSession();
  const { data, error, loading } = useApi<Stats & { success: boolean }>("admin/stats");

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Could not load stats."} />;

  const attention = [
    { label: "Providers awaiting verification review", value: data.providers.inReview, href: "/verifications" },
    { label: "Failed provider verifications", value: data.providers.failed, href: "/verifications?tier=failed" },
    { label: "Jobs held by the risk engine", value: data.jobs.riskHeld, href: "/verifications?tab=jobs" },
    { label: "Disputes awaiting customer care", value: data.disputes.awaitingReview, href: "/customer-care?tab=disputes" },
  ];
  const escrowFunded = data.jobs.byEscrow.funded;
  const totalJobs = Object.values(data.jobs.byStatus).reduce((sum, count) => sum + count, 0);

  return (
    <>
      <PageHeader title={`Hello, ${admin.name.split(" ")[0]}`} description="What needs attention across the Swiftgigs platform right now." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Providers" value={number(data.providers.total)} hint={`${number(data.providers.verified)} verified`} href="/users" />
        <StatCard label="Clients" value={number(data.clients.total)} hint={`${number(data.clients.verified)} verified`} href="/users?tab=clients" />
        <StatCard label="Money in escrow" value={naira(escrowFunded?.amount)} hint={`${number(escrowFunded?.count)} funded jobs`} href="/jobs?escrow=funded" />
        <StatCard label="Open disputes" value={number(data.disputes.open)} tone={data.disputes.open ? "alert" : undefined} href="/customer-care?tab=disputes" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-display text-lg font-bold text-ink">Activity</h2>
          <JobsChart perDay={data.jobs.perDay} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Needs attention</h2>
          <ul className="divide-y divide-border">
            {attention.map((item) => (
              <li key={item.label}>
                <Link href={item.href} className="group flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="text-muted-foreground group-hover:text-foreground">{item.label}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={item.value ? "rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive" : "text-xs text-muted-foreground"}>{item.value}</span>
                    <ArrowRight className="size-3.5 text-muted-foreground/60 group-hover:text-primary" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Jobs by status <span className="text-sm font-normal text-muted-foreground">({number(totalJobs)})</span></h2>
          <ul className="space-y-2.5 text-sm">
            {Object.entries(data.jobs.byStatus).map(([status, count]) => (
              <li key={status}>
                <div className="mb-1 flex justify-between"><span>{humanize(status)}</span><span className="font-medium">{number(count)}</span></div>
                <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary/70" style={{ width: `${(count / Math.max(1, totalJobs)) * 100}%` }} /></div>
              </li>
            ))}
            {!totalJobs && <li className="text-muted-foreground">No jobs yet.</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Escrow</h2>
          <ul className="space-y-2.5 text-sm">
            {Object.entries(data.jobs.byEscrow).map(([status, { count, amount }]) => (
              <li key={status} className="flex justify-between"><span>{humanize(status)} <span className="text-muted-foreground">· {count}</span></span><span className="font-medium">{naira(amount)}</span></li>
            ))}
            {!Object.keys(data.jobs.byEscrow).length && <li className="text-muted-foreground">No escrow activity yet.</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold text-ink">Platform</h2>
          <dl className="space-y-2.5 text-sm">
            {[
              ["Commission", `${(data.fees.commissionRate * 100).toFixed(1).replace(/\.0$/, "")}% (cap ${naira(data.fees.commissionCapNgn)})`, "/fees"],
              ["Services in catalogue", number(data.services), "/services"],
              ["Customer care agents", `${data.customerCare.active} active of ${data.customerCare.total}`, "/customer-care"],
              ["Blog posts", `${data.blog.published} published, ${data.blog.drafts} drafts`, "/blog"],
              ["Banned identities", number(data.blocked), "/users"],
            ].map(([label, value, href]) => (
              <div key={label} className="flex justify-between gap-4"><dt className="text-muted-foreground">{label}</dt><dd><Link href={href as string} className="font-medium hover:text-primary">{value}</Link></dd></div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
