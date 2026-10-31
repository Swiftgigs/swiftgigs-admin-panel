"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Star, Trash2 } from "lucide-react";
import { api, qs, useApi } from "@/lib/api";
import { Badge, Button, DataTable, ErrorNote, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, StatusBadge, Tabs, useAction, useFeedback } from "@/components/ui";
import type { Column } from "@/components/ui";
import { date, naira, shortId } from "@/lib/format";
import type { CareAgent, Dispute, Paged } from "@/lib/types";

const emptyForm = { phoneNumber: "", name: "", email: "", taskStatus: "active" };

function AgentModal({ agent, open, onClose, onSaved }: { agent: CareAgent | null; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(agent ? { phoneNumber: agent.phoneNumber, name: agent.name, email: agent.email || "", taskStatus: agent.taskStatus } : emptyForm);
  const { run, busy } = useAction();
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async () => {
    const ok = await run(
      () => agent
        ? api(`customer-care/${agent.phoneNumber}`, { method: "PATCH", body: { name: form.name, email: form.email, taskStatus: form.taskStatus } })
        : api("customer-care", { method: "POST", body: form }),
      agent ? "Agent updated" : "Agent added",
    );
    if (ok) { onSaved(); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title={agent ? "Edit agent" : "Add customer care agent"}
      description={agent ? undefined : "Use the WhatsApp number the agent will message the bot from."}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!form.phoneNumber.trim()} onClick={save}>{agent ? "Save changes" : "Add agent"}</Button></>}>
      <div className="space-y-4">
        <Field label="WhatsApp number" hint="Digits only, with country code, e.g. 2348012345678.">{(id) => <Input id={id} value={form.phoneNumber} onChange={set("phoneNumber")} disabled={Boolean(agent)} inputMode="numeric" />}</Field>
        <Field label="Name">{(id) => <Input id={id} value={form.name} onChange={set("name")} />}</Field>
        <Field label="Email">{(id) => <Input id={id} type="email" value={form.email} onChange={set("email")} />}</Field>
        <Field label="Availability" hint="Inactive agents are not assigned new disputes.">
          {(id) => (
            <Select id={id} value={form.taskStatus} onChange={set("taskStatus")}>
              <option value="active">Active</option>
              <option value="busy">Busy</option>
              <option value="inactive">Inactive</option>
            </Select>
          )}
        </Field>
      </div>
    </Modal>
  );
}

function Agents() {
  const { data, error, loading, reload } = useApi<{ data: CareAgent[] }>("customer-care");
  const [editing, setEditing] = useState<CareAgent | null>(null);
  const [adding, setAdding] = useState(false);
  const { confirm } = useFeedback();
  const { run } = useAction();

  const remove = async (agent: CareAgent) => {
    const ok = await confirm({ title: `Remove ${agent.name}?`, message: "They will no longer be able to receive disputes. Agents with active disputes cannot be removed.", confirmLabel: "Remove", danger: true });
    if (ok && await run(() => api(`customer-care/${agent.phoneNumber}`, { method: "DELETE" }), "Agent removed")) reload();
  };

  const columns: Column<CareAgent>[] = [
    { header: "Agent", cell: (a) => <div><p className="font-medium text-ink">{a.name}</p><p className="text-xs text-muted-foreground">{a.phoneNumber}{a.email ? ` · ${a.email}` : ""}</p></div> },
    { header: "Status", cell: (a) => <StatusBadge value={a.taskStatus} /> },
    { header: "Active disputes", cell: (a) => a.activeDisputesById?.length || 0 },
    { header: "Resolved", cell: (a) => a.completedResolutions },
    { header: "Decisions", cell: (a) => <span className="whitespace-nowrap text-xs text-muted-foreground">release {a.decisionStats?.release ?? 0} · split {a.decisionStats?.split ?? 0} · refund {a.decisionStats?.refund ?? 0}</span> },
    { header: "Rating", cell: (a) => (a.ratingSummary?.totalRatings ? <span className="inline-flex items-center gap-1"><Star className="size-3.5 fill-warning text-warning" aria-hidden />{a.ratingSummary.average.toFixed(1)} <span className="text-xs text-muted-foreground">({a.ratingSummary.totalRatings})</span></span> : <span className="text-muted-foreground">—</span>) },
    { header: "Last resolved", cell: (a) => <span className="whitespace-nowrap text-muted-foreground">{date(a.lastResolvedAt)}</span> },
    { header: "", className: "text-right", cell: (a) => (
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => setEditing(a)}>Edit</Button>
        <Button size="sm" variant="ghost" aria-label={`Remove ${a.name}`} onClick={() => remove(a)}><Trash2 className="size-4 text-destructive" /></Button>
      </div>
    ) },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end"><Button onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden />Add agent</Button></div>
      <DataTable columns={columns} rows={data?.data} rowKey={(a) => a._id} loading={loading} error={error} empty="No customer care agents yet. Add one so disputes can be assigned." />
      <AgentModal key={`add-${adding}`} agent={null} open={adding} onClose={() => setAdding(false)} onSaved={reload} />
      <AgentModal key={editing?._id ?? "edit"} agent={editing} open={Boolean(editing)} onClose={() => setEditing(null)} onSaved={reload} />
    </>
  );
}

const LIMIT = 15;

function EvidenceBlock({ title, evidence }: { title: string; evidence: Dispute["clientEvidence"] }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <h4 className="mb-1 text-sm font-semibold text-ink">{title}</h4>
      <p className="text-sm text-muted-foreground">{evidence.description || "No description submitted."}</p>
      {evidence.media.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          {evidence.media.map((url, index) => (
            <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="rounded-md bg-primary/10 px-2 py-1 font-medium text-primary hover:underline">Attachment {index + 1}</a></li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Disputes({ agents }: { agents: CareAgent[] }) {
  const params = useSearchParams();
  const [status, setStatus] = useState(params.get("status") || "");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Dispute | null>(null);
  const [assignee, setAssignee] = useState("");
  const { data, error, loading, reload } = useApi<Paged<Dispute>>(`admin/disputes${qs({ status, page, limit: LIMIT })}`);
  const { run, busy } = useAction();

  const assign = async () => {
    if (!selected || !assignee) return;
    if (await run(() => api(`admin/disputes/${selected._id}/assign`, { method: "POST", body: { customerCareId: assignee } }), "Dispute reassigned")) {
      setSelected(null);
      reload();
    }
  };

  const agentName = (phone: string | null) => (phone ? agents.find((a) => a.phoneNumber === phone)?.name || phone : null);

  const columns: Column<Dispute>[] = [
    { header: "Dispute", cell: (d) => <div><p className="font-medium text-ink">{d.jobSnapshot?.serviceType || "Job"}</p><p className="text-xs text-muted-foreground">{shortId(d.jobId)} · {date(d.createdAt)}</p></div> },
    { header: "Amount", cell: (d) => naira(d.jobSnapshot?.agreedPrice) },
    { header: "Parties", cell: (d) => <span className="text-xs text-muted-foreground">client {d.clientId}<br />provider {d.serviceProviderId}</span> },
    { header: "Status", cell: (d) => <StatusBadge value={d.status} /> },
    { header: "Assigned to", cell: (d) => agentName(d.customerCareId) || <Badge tone="warning">unassigned</Badge> },
    { header: "Outcome", cell: (d) => (d.resolution?.decision ? <Badge tone="brand">{d.resolution.decision}</Badge> : <span className="text-muted-foreground">—</span>) },
  ];

  return (
    <>
      <div className="mb-4">
        <Select aria-label="Dispute status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="w-auto">
          <option value="">All disputes</option>
          <option value="open">Open</option>
          <option value="awaiting_provider_evidence">Awaiting provider evidence</option>
          <option value="awaiting_customer_care_review">Awaiting customer care review</option>
          <option value="resolved">Resolved</option>
        </Select>
      </div>
      <DataTable columns={columns} rows={data?.data} rowKey={(d) => d._id} loading={loading} error={error} onRowClick={(d) => { setSelected(d); setAssignee(d.customerCareId || ""); }} empty="No disputes found." />
      {data && <Pagination page={page} limit={LIMIT} total={data.total} onPage={setPage} />}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} wide title="Dispute details" description={selected ? `Job ${selected.jobId}` : undefined}
        footer={selected && selected.status !== "resolved" ? <><Button variant="secondary" onClick={() => setSelected(null)}>Close</Button><Button loading={busy} disabled={!assignee || assignee === selected.customerCareId} onClick={assign}>Assign agent</Button></> : undefined}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Amount in escrow</p><p className="font-semibold text-ink">{naira(selected.jobSnapshot?.agreedPrice)}</p></div>
              <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge value={selected.status} /></div>
              {selected.providerEvidenceDueAt && selected.status === "awaiting_provider_evidence" && <div><p className="text-xs text-muted-foreground">Provider evidence due</p><p>{date(selected.providerEvidenceDueAt, true)}</p></div>}
              {selected.resolution?.decision && <div><p className="text-xs text-muted-foreground">Resolution</p><p>{selected.resolution.decision} · {date(selected.resolution.decidedAt, true)}</p></div>}
            </div>
            <EvidenceBlock title="Client evidence" evidence={selected.clientEvidence} />
            <EvidenceBlock title="Provider evidence" evidence={selected.providerEvidence} />
            {selected.status !== "resolved" ? (
              <Field label="Assign to agent" hint="Final decisions (release / split / refund) are made by the agent in their WhatsApp dashboard.">
                {(id) => (
                  <Select id={id} value={assignee} onChange={(event) => setAssignee(event.target.value)}>
                    <option value="">Select an agent…</option>
                    {agents.map((agent) => <option key={agent.phoneNumber} value={agent.phoneNumber}>{agent.name} · {agent.taskStatus} · {agent.activeDisputesById?.length || 0} active</option>)}
                  </Select>
                )}
              </Field>
            ) : <p className="text-sm text-muted-foreground">This dispute is resolved and can no longer be reassigned.</p>}
          </div>
        )}
      </Modal>
    </>
  );
}

function CustomerCareContent() {
  const params = useSearchParams();
  const [tab, setTab] = useState<"agents" | "disputes">(params.get("tab") === "disputes" ? "disputes" : "agents");
  const { data: agentsData, loading: agentsLoading, error: agentsError } = useApi<{ data: CareAgent[] }>("customer-care");

  return (
    <>
      <PageHeader title="Customer care" description="Manage the agents who resolve disputes, and watch the dispute queue." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "agents", label: "Agents" }, { id: "disputes", label: "Disputes" }]} />
      {tab === "agents" ? <Agents /> : agentsLoading ? <Spinner /> : agentsError ? <ErrorNote message={agentsError} /> : <Disputes agents={agentsData?.data || []} />}
    </>
  );
}

export default function CustomerCarePage() {
  return (
    <Suspense>
      <CustomerCareContent />
    </Suspense>
  );
}
