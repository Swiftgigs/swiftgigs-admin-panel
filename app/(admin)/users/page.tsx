"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Ban, Star } from "lucide-react";
import { api, qs, useApi, useDebounced } from "@/lib/api";
import { Badge, Button, DataTable, ErrorNote, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Spinner, StatusBadge, Tabs, Textarea, useAction, useFeedback } from "@/components/ui";
import type { Column } from "@/components/ui";
import { date, naira } from "@/lib/format";
import type { Client, Paged, Provider, ProviderDetail } from "@/lib/types";

const LIMIT = 20;

function BanControl({ kind, id, banned, reason, onChanged }: { kind: "provider" | "client"; id: string; banned: boolean; reason?: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const { run, busy } = useAction();
  const { confirm } = useFeedback();

  const ban = async () => {
    if (await run(() => api(`admin/users/${kind}/${id}/ban`, { method: "POST", body: { reason: text } }), "Banned by NIN hash")) {
      setOpen(false);
      setText("");
      onChanged();
    }
  };

  const unban = async () => {
    const ok = await confirm({ title: "Lift ban?", message: "This person will be able to register and transact again.", confirmLabel: "Lift ban" });
    if (ok && await run(() => api(`admin/users/${kind}/${id}/ban`, { method: "DELETE" }), "Ban lifted")) onChanged();
  };

  return (
    <>
      {banned ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <div className="text-sm"><p className="font-semibold text-destructive">Banned</p>{reason && <p className="text-xs text-muted-foreground">{reason}</p>}</div>
          <Button size="sm" variant="secondary" loading={busy} onClick={unban}>Lift ban</Button>
        </div>
      ) : (
        <Button variant="danger" size="sm" onClick={() => setOpen(true)}><Ban className="size-3.5" aria-hidden />Ban user</Button>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Ban this user?" description="The ban is applied to their NIN hash, so they cannot re-register on another number."
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button variant="danger" loading={busy} disabled={!text.trim()} onClick={ban}>Ban user</Button></>}>
        <Field label="Reason (stored on the blocklist)">{(id) => <Textarea id={id} rows={3} value={text} onChange={(event) => setText(event.target.value)} />}</Field>
      </Modal>
    </>
  );
}

function ProviderDrawer({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const { data, error, loading, reload } = useApi<{ data: ProviderDetail }>(id ? `admin/providers/${id}` : null);
  const [strikes, setStrikes] = useState<string>("");
  const { run, busy } = useAction();
  const provider = data?.data;

  const refresh = () => { reload(); onChanged(); };
  const save = (body: object, message: string) => run(() => api(`admin/providers/${id}`, { method: "PATCH", body }), message).then((ok) => ok && refresh());

  return (
    <Modal open={Boolean(id)} onClose={onClose} wide title={provider?.name || "Provider"} description={provider ? `${provider.phone_number} · ${provider.service_type}` : undefined}>
      {loading && <Spinner />}
      {error && <ErrorNote message={error} />}
      {provider && (
        <div className="space-y-6">
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            {[
              ["Verification", <StatusBadge key="v" value={provider.verification?.tier || "unverified"} />],
              ["Rating", <span key="r" className="inline-flex items-center gap-1"><Star className="size-3.5 fill-warning text-warning" aria-hidden />{provider.rating?.toFixed(1) || "0.0"}</span>],
              ["Jobs completed", provider.jobs_completed ?? 0],
              ["Registered", date(provider.registered_at)],
              ["Location", provider.location?.address || "—"],
              ["Payout account", provider.bank_name ? `${provider.bank_name} ${provider.account_number_masked} (${provider.account_name})` : "—"],
              ["Emergency contact", provider.emergency_contact || "—"],
              ["Alt. phone", provider.alt_phone_number || "—"],
            ].map(([label, value]) => (
              <div key={label as string}><p className="text-xs font-medium text-muted-foreground">{label}</p><div className="mt-0.5 text-ink">{value}</div></div>
            ))}
          </div>

          <div className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
            <Field label="Strikes" hint="Fed into the risk engine.">
              {(fid) => (
                <div className="flex gap-2">
                  <Input id={fid} type="number" min={0} value={strikes === "" ? String(provider.strikes ?? 0) : strikes} onChange={(event) => setStrikes(event.target.value)} />
                  <Button variant="secondary" loading={busy} onClick={() => save({ strikes: Number(strikes === "" ? provider.strikes : strikes) }, "Strikes updated")}>Save</Button>
                </div>
              )}
            </Field>
            <Field label="Availability" hint="Offline providers are skipped in matching.">
              {(fid) => (
                <Select id={fid} value={provider.availability_status || "online"} disabled={busy} onChange={(event) => save({ availability_status: event.target.value }, "Availability updated")}>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </Select>
              )}
            </Field>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-ink">Recent jobs</h3>
            {provider.recent_jobs.length ? (
              <ul className="divide-y divide-border rounded-xl border border-border text-sm">
                {provider.recent_jobs.map((job) => (
                  <li key={job._id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span>{job.service_type} <span className="text-muted-foreground">· {date(job.createdAt)}</span></span>
                    <span className="flex items-center gap-2"><span className="font-medium">{naira(job.agreed_price)}</span><StatusBadge value={job.escrow_status} /></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No jobs yet.</p>}
          </div>

          {provider.has_nin
            ? <BanControl kind="provider" id={provider._id} banned={Boolean(provider.ban)} reason={provider.ban?.reason} onChanged={refresh} />
            : <p className="text-xs text-muted-foreground">No NIN on file, so this provider cannot be added to the NIN blocklist yet.</p>}
        </div>
      )}
    </Modal>
  );
}

function Providers() {
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const q = useDebounced(search);
  const { data, error, loading, reload } = useApi<Paged<Provider>>(`admin/providers${qs({ q, tier, page, limit: LIMIT })}`);

  const columns: Column<Provider>[] = [
    { header: "Provider", cell: (p) => <div><p className="font-medium text-ink">{p.name}</p><p className="text-xs text-muted-foreground">{p.phone_number}</p></div> },
    { header: "Service", cell: (p) => <div><p>{p.service_type}</p><p className="text-xs text-muted-foreground">{p.service_category}</p></div> },
    { header: "Verification", cell: (p) => <StatusBadge value={p.verification?.tier || "unverified"} /> },
    { header: "Jobs", cell: (p) => p.jobs_completed ?? 0 },
    { header: "Rating", cell: (p) => (p.rating ? p.rating.toFixed(1) : "—") },
    { header: "Strikes", cell: (p) => ((p.strikes ?? 0) > 0 ? <Badge tone="warning">{p.strikes}</Badge> : 0) },
    { header: "Status", cell: (p) => (p.banned ? <StatusBadge value="banned" /> : <StatusBadge value={p.availability_status || "online"} />) },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search name, phone, service…" />
        <Select aria-label="Verification filter" value={tier} onChange={(event) => { setTier(event.target.value); setPage(1); }} className="w-auto">
          <option value="">All verification states</option>
          {["verified", "unverified", "pending", "review", "step_up_required", "failed"].map((value) => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}
        </Select>
      </div>
      <DataTable columns={columns} rows={data?.data} rowKey={(p) => p._id} loading={loading} error={error} onRowClick={(p) => setSelected(p._id)} empty="No providers found." />
      {data && <Pagination page={page} limit={LIMIT} total={data.total} onPage={setPage} />}
      <ProviderDrawer id={selected} onClose={() => setSelected(null)} onChanged={reload} />
    </>
  );
}

function ClientDrawer({ client, onClose, onChanged }: { client: Client | null; onClose: () => void; onChanged: () => void }) {
  const [flags, setFlags] = useState("");
  const { run, busy } = useAction();
  if (!client) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;

  return (
    <Modal open onClose={() => { setFlags(""); onClose(); }} title={client.name || "Client"} description={client.phone_number}>
      <div className="space-y-5 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs font-medium text-muted-foreground">Verification</p><div className="mt-0.5"><StatusBadge value={client.verification?.tier || "unverified"} /></div></div>
          <div><p className="text-xs font-medium text-muted-foreground">Jobs requested</p><p className="mt-0.5 text-ink">{client.jobs_requested}</p></div>
        </div>
        <Field label="Safety flags" hint="Provider-reported safety problems; fed into the risk engine.">
          {(id) => (
            <div className="flex gap-2">
              <Input id={id} type="number" min={0} value={flags === "" ? String(client.safety_flags ?? 0) : flags} onChange={(event) => setFlags(event.target.value)} />
              <Button variant="secondary" loading={busy} onClick={async () => { if (await run(() => api(`admin/clients/${client._id}`, { method: "PATCH", body: { safety_flags: Number(flags === "" ? client.safety_flags : flags) } }), "Safety flags updated")) { setFlags(""); onChanged(); onClose(); } }}>Save</Button>
            </div>
          )}
        </Field>
        {client.has_nin
          ? <BanControl kind="client" id={client._id} banned={client.banned} onChanged={() => { onChanged(); onClose(); }} />
          : <p className="text-xs text-muted-foreground">No NIN on file, so this client cannot be added to the NIN blocklist yet.</p>}
      </div>
    </Modal>
  );
}

function Clients() {
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Client | null>(null);
  const q = useDebounced(search);
  const { data, error, loading, reload } = useApi<Paged<Client>>(`admin/clients${qs({ q, tier, page, limit: LIMIT })}`);

  const columns: Column<Client>[] = [
    { header: "Client", cell: (c) => <div><p className="font-medium text-ink">{c.name || "Unnamed"}</p><p className="text-xs text-muted-foreground">{c.phone_number}</p></div> },
    { header: "Verification", cell: (c) => <StatusBadge value={c.verification?.tier || "unverified"} /> },
    { header: "Jobs", cell: (c) => c.jobs_requested },
    { header: "Safety flags", cell: (c) => ((c.safety_flags ?? 0) > 0 ? <Badge tone="warning">{c.safety_flags}</Badge> : 0) },
    { header: "Joined", cell: (c) => <span className="text-muted-foreground">{date(c.createdAt)}</span> },
    { header: "Status", cell: (c) => (c.banned ? <StatusBadge value="banned" /> : <span className="text-muted-foreground">—</span>) },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search name or phone…" />
        <Select aria-label="Verification filter" value={tier} onChange={(event) => { setTier(event.target.value); setPage(1); }} className="w-auto">
          <option value="">All verification states</option>
          {["verified", "unverified", "failed"].map((value) => <option key={value} value={value}>{value}</option>)}
        </Select>
      </div>
      <DataTable columns={columns} rows={data?.data} rowKey={(c) => c._id} loading={loading} error={error} onRowClick={setSelected} empty="No clients found." />
      {data && <Pagination page={page} limit={LIMIT} total={data.total} onPage={setPage} />}
      <ClientDrawer client={selected} onClose={() => setSelected(null)} onChanged={reload} />
    </>
  );
}

function UsersContent() {
  const params = useSearchParams();
  const [tab, setTab] = useState<"providers" | "clients">(params.get("tab") === "clients" ? "clients" : "providers");
  return (
    <>
      <PageHeader title="Users" description="Providers (workers) and clients registered through WhatsApp. Select a row to manage strikes, availability and bans." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "providers", label: "Providers" }, { id: "clients", label: "Clients" }]} />
      {tab === "providers" ? <Providers /> : <Clients />}
    </>
  );
}

export default function UsersPage() {
  return (
    <Suspense>
      <UsersContent />
    </Suspense>
  );
}
