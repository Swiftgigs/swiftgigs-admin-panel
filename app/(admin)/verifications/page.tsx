"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { api, qs, useApi, useDebounced } from "@/lib/api";
import { Badge, Button, DataTable, Pagination, PageHeader, SearchInput, Select, StatusBadge, Tabs, buttonClass, useAction, useFeedback } from "@/components/ui";
import type { Column } from "@/components/ui";
import { date, naira, shortId } from "@/lib/format";
import type { HeldJob, Paged, VerificationRow } from "@/lib/types";

type Tab = "provider" | "client" | "jobs";
const LIMIT = 20;

function NameMatch({ row }: { row: VerificationRow }) {
  if (!row.nameMatchResult) return <span className="text-muted-foreground">{row.kycVendor || "—"}</span>;
  return (
    <div className="flex flex-col gap-1">
      <StatusBadge value={row.nameMatchResult} />
      <span className="text-xs text-muted-foreground">{row.nameMatchHits !== null ? `${row.nameMatchHits} hit${row.nameMatchHits === 1 ? "" : "s"}` : ""}{row.kycVendor ? ` · ${row.kycVendor}` : ""}</span>
    </div>
  );
}

function VerificationTable({ kind }: { kind: "provider" | "client" }) {
  const params = useSearchParams();
  const [tier, setTier] = useState(params.get("tier") || "");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const { confirm } = useFeedback();
  const { run, busy } = useAction();

  const filters = { kind, tier, q };
  const { data, error, loading, reload } = useApi<Paged<VerificationRow>>(`admin/verifications${qs({ ...filters, page, limit: LIMIT })}`);
  // Same filters, no paging: the backend streams the whole matching set.
  const csvHref = `/api/backend/admin/verifications${qs({ ...filters, format: "csv" })}`;

  const decide = async (row: VerificationRow, decision: "verified" | "failed") => {
    const approve = decision === "verified";
    const ok = await confirm({
      title: approve ? "Approve verification?" : "Reject verification?",
      message: approve
        ? `${row.name} will be marked verified and any waiting job contact details will be released.`
        : `${row.name} will be marked failed and their clients are offered a wait / switch / refund choice.`,
      confirmLabel: approve ? "Approve" : "Reject",
      danger: !approve,
    });
    if (ok && await run(() => api(`admin/provider-verifications/${row.phone}/decision`, { method: "POST", body: { decision } }), `Marked ${decision}`)) reload();
  };

  const reset = async (row: VerificationRow) => {
    const ok = await confirm({
      title: "Reset to unverified?",
      message: `${row.name} will be allowed to restart the NIN verification flow. This does not mark them verified.`,
      confirmLabel: "Reset",
    });
    if (ok && await run(() => api(`admin/verifications/${row.kind}/${row.phone}/reset`, { method: "POST" }), "Reset. They can retry verification.")) reload();
  };

  const columns: Column<VerificationRow>[] = [
    { header: "Name", cell: (row) => <div><p className="font-medium text-ink">{row.name || "Unnamed"}</p><p className="text-xs text-muted-foreground">{row.phone}{row.service ? ` · ${row.service}` : ""}</p></div> },
    { header: "Status", cell: (row) => <StatusBadge value={row.tier} /> },
    { header: "Name match", cell: (row) => <NameMatch row={row} /> },
    ...(kind === "provider" ? [{
      header: "Payout name",
      cell: (row: VerificationRow) => (
        <div>
          {row.payoutNameMatched === null ? <span className="text-muted-foreground">—</span> : <Badge tone={row.payoutNameMatched ? "success" : "danger"}>{row.payoutNameMatched ? "matches" : "mismatch"}</Badge>}
          {row.payoutAccountName && <p className="mt-1 max-w-40 truncate text-xs text-muted-foreground">{row.payoutAccountName}</p>}
        </div>
      ),
    }] : []),
    { header: "Stalled jobs", cell: (row) => (row.affectedJobs ? <Badge tone="warning">{row.affectedJobs}</Badge> : <span className="text-muted-foreground">0</span>) },
    { header: "Registered", cell: (row) => <span className="whitespace-nowrap text-muted-foreground">{date(row.registeredAt)}</span> },
    {
      header: "",
      className: "text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1.5">
          {row.kind === "provider" && (row.tier === "review" || row.tier === "step_up_required") && (
            <>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => decide(row, "failed")}>Reject</Button>
              <Button size="sm" disabled={busy} onClick={() => decide(row, "verified")}>Approve</Button>
            </>
          )}
          {row.tier === "failed" && <Button size="sm" variant="secondary" disabled={busy} onClick={() => reset(row)}>Allow retry</Button>}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search name, phone, reference…" />
          <Select aria-label="Status filter" value={tier} onChange={(event) => { setTier(event.target.value); setPage(1); }} className="w-auto">
            <option value="">All issues</option>
            <option value="failed">Failed</option>
            {kind === "provider" && <option value="review">In review</option>}
            {kind === "provider" && <option value="step_up_required">Step-up required</option>}
            <option value="unverified">Unverified</option>
          </Select>
        </div>
        <a href={csvHref} download className={buttonClass("secondary")}><Download className="size-4" aria-hidden />Export CSV</a>
      </div>
      <DataTable columns={columns} rows={data?.data} rowKey={(row) => row.id} loading={loading} error={error} empty="No verification issues match these filters." />
      {data && <Pagination page={page} limit={LIMIT} total={data.total} onPage={setPage} />}
    </>
  );
}

function HeldJobs() {
  const { data, error, loading, reload } = useApi<{ jobs: HeldJob[] }>("admin/jobs/risk-review");
  const { confirm } = useFeedback();
  const { run, busy } = useAction();

  const decide = async (job: HeldJob, decision: "approve" | "reject") => {
    const ok = await confirm({
      title: decision === "approve" ? "Approve this job?" : "Reject this job?",
      message: decision === "approve" ? "Contact details will be released to both parties." : "The job is stopped and the client is refunded per the platform flow.",
      confirmLabel: decision === "approve" ? "Approve" : "Reject",
      danger: decision === "reject",
    });
    if (ok && await run(() => api(`admin/jobs/${job._id}/risk-decision`, { method: "POST", body: { decision } }), `Job ${decision}d`)) reload();
  };

  const columns: Column<HeldJob>[] = [
    { header: "Job", cell: (job) => <div><p className="font-medium text-ink">{job.service_type}</p><p className="text-xs text-muted-foreground">{shortId(job._id)}</p></div> },
    { header: "Provider", cell: (job) => job.serviceproviderId },
    { header: "Client", cell: (job) => job.serviceRequesterId },
    { header: "Price", cell: (job) => naira(job.agreed_price) },
    { header: "Risk", cell: (job) => <Badge tone={(job.risk_score ?? 0) >= 70 ? "danger" : "warning"}>{job.risk_score ?? "—"}</Badge> },
    { header: "Flags", cell: (job) => <div className="flex max-w-60 flex-wrap gap-1">{job.risk_flags?.map((flag) => <Badge key={flag}>{flag.replace(/_/g, " ")}</Badge>)}</div> },
    {
      header: "",
      className: "text-right",
      cell: (job) => (
        <div className="flex justify-end gap-1.5">
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => decide(job, "reject")}>Reject</Button>
          <Button size="sm" disabled={busy} onClick={() => decide(job, "approve")}>Approve</Button>
        </div>
      ),
    },
  ];

  return <DataTable columns={columns} rows={data?.jobs} rowKey={(job) => job._id} loading={loading} error={error} empty="No jobs are being held for risk review." />;
}

function VerificationsContent() {
  const params = useSearchParams();
  const initial = params.get("tab") === "jobs" ? "jobs" : params.get("tab") === "client" ? "client" : "provider";
  const [tab, setTab] = useState<Tab>(initial);

  return (
    <>
      <PageHeader
        title="Verification issues"
        description="Providers and clients whose identity check failed or stalled, plus jobs held by the risk engine. Export the filtered list as CSV for offline review."
      />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: "provider", label: "Providers" }, { id: "client", label: "Clients" }, { id: "jobs", label: "Held jobs" }]} />
      {tab === "jobs" ? <HeldJobs /> : <VerificationTable key={tab} kind={tab} />}
    </>
  );
}

export default function VerificationsPage() {
  return (
    <Suspense>
      <VerificationsContent />
    </Suspense>
  );
}

