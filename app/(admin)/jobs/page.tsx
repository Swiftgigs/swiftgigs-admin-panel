"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { qs, useApi, useDebounced } from "@/lib/api";
import { DataTable, PageHeader, Pagination, SearchInput, Select, StatusBadge } from "@/components/ui";
import type { Column } from "@/components/ui";
import { date, naira, shortId } from "@/lib/format";
import type { Job, Paged } from "@/lib/types";

const LIMIT = 25;
const STATUSES = ["started", "awaiting_requester_confirmation", "completed", "cancelled", "paused"];
const ESCROW = ["unpaid", "funded", "released", "disputed", "refunded", "partially_released"];

const columns: Column<Job>[] = [
  { header: "Job", cell: (job) => <div><p className="font-medium text-ink">{job.service_type}</p><p className="text-xs text-muted-foreground">{shortId(job._id)} · {date(job.createdAt, true)}</p></div> },
  { header: "Provider", cell: (job) => job.serviceproviderId },
  { header: "Client", cell: (job) => job.serviceRequesterId },
  { header: "Price", cell: (job) => <span className="font-medium">{naira(job.agreed_price)}</span> },
  { header: "Status", cell: (job) => <StatusBadge value={job.status} /> },
  { header: "Escrow", cell: (job) => <StatusBadge value={job.escrow_status} /> },
  { header: "Risk", cell: (job) => (job.risk_decision ? <div className="flex items-center gap-1.5"><StatusBadge value={job.risk_decision} />{job.risk_score !== undefined && <span className="text-xs text-muted-foreground">{job.risk_score}</span>}</div> : "—") },
];

function JobsContent() {
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") || "");
  const [escrow, setEscrow] = useState(params.get("escrow") || "");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const { data, error, loading } = useApi<Paged<Job>>(`admin/jobs${qs({ q, status, escrow, page, limit: LIMIT })}`);

  return (
    <>
      <PageHeader title="Jobs" description="Every task agreed on the platform, with its escrow state and risk outcome." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search service, phone, reference…" />
        <Select aria-label="Job status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="w-auto">
          <option value="">Any status</option>
          {STATUSES.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
        </Select>
        <Select aria-label="Escrow status" value={escrow} onChange={(event) => { setEscrow(event.target.value); setPage(1); }} className="w-auto">
          <option value="">Any escrow state</option>
          {ESCROW.map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
        </Select>
      </div>
      <DataTable columns={columns} rows={data?.data} rowKey={(job) => job._id} loading={loading} error={error} empty="No jobs match these filters." />
      {data && <Pagination page={page} limit={LIMIT} total={data.total} onPage={setPage} />}
    </>
  );
}

export default function JobsPage() {
  return (
    <Suspense>
      <JobsContent />
    </Suspense>
  );
}
