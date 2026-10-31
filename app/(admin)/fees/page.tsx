"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Field, Input, PageHeader, Spinner, useAction, useFeedback } from "@/components/ui";
import { date, naira, nairaExact, toDateInput } from "@/lib/format";
import { useSession } from "@/components/session";
import type { Fees } from "@/lib/types";

function FeeForm({ fees, onSaved }: { fees: Fees; onSaved: () => void }) {
  const admin = useSession();
  const canEdit = admin.role === "super_admin";
  const [rate, setRate] = useState(String(+(fees.commissionRate * 100).toFixed(2)));
  const [cap, setCap] = useState(String(fees.commissionCapNgn));
  const [start, setStart] = useState(toDateInput(fees.commissionStartDate));
  const [sample, setSample] = useState("15000");
  const { run, busy } = useAction();
  const { confirm } = useFeedback();

  const ratePct = Number(rate);
  const capNgn = Number(cap);
  const valid = rate !== "" && cap !== "" && start !== "" && ratePct >= 0 && ratePct <= 100 && capNgn >= 0;
  const dirty = valid && (ratePct / 100 !== fees.commissionRate || capNgn !== fees.commissionCapNgn || start !== toDateInput(fees.commissionStartDate));

  const price = Math.max(0, Number(sample) || 0);
  const commission = Math.min(price * (ratePct / 100), capNgn);
  const startsInFuture = start && new Date(start) > new Date();

  const save = async () => {
    const ok = await confirm({
      title: "Update platform fees?",
      message: `Commission becomes ${ratePct}% (capped at ${naira(capNgn)}) from ${date(start)}. This applies to all future dispute payouts and refunds; completed jobs are not changed.`,
      confirmLabel: "Update fees",
    });
    if (ok && await run(() => api("admin/fees", { method: "PUT", body: { commissionRate: ratePct / 100, commissionCapNgn: capNgn, commissionStartDate: new Date(start).toISOString() } }), "Fees updated")) onSaved();
  };

  const restoreDefaults = () => {
    setRate(String(+(fees.defaults.commissionRate * 100).toFixed(2)));
    setCap(String(fees.defaults.commissionCapNgn));
    setStart(toDateInput(fees.defaults.commissionStartDate));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="space-y-5 p-6 lg:col-span-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Worker commission</h2>
          <Badge tone={fees.source === "database" ? "brand" : "neutral"}>{fees.source === "database" ? "Custom" : "Environment defaults"}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Deducted from the worker’s payout when a dispute is resolved, and from refunds. Customers always see the negotiated price.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Commission rate (%)" hint="Share of the agreed price.">{(id) => <Input id={id} type="number" min={0} max={100} step="0.1" value={rate} onChange={(event) => setRate(event.target.value)} disabled={!canEdit} />}</Field>
          <Field label="Cap per job (₦)" hint="Commission never exceeds this amount.">{(id) => <Input id={id} type="number" min={0} step="100" value={cap} onChange={(event) => setCap(event.target.value)} disabled={!canEdit} />}</Field>
          <Field label="Commission starts on" hint="No commission is charged before this date.">{(id) => <Input id={id} type="date" value={start} onChange={(event) => setStart(event.target.value)} disabled={!canEdit} />}</Field>
        </div>

        {startsInFuture && <p className="flex items-start gap-2 rounded-lg bg-warning/10 p-3 text-xs text-warning"><Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />Commission is currently waived. It begins on {date(start)}.</p>}

        {canEdit ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button loading={busy} disabled={!dirty} onClick={save}>Save changes</Button>
            <Button variant="secondary" onClick={restoreDefaults}>Fill in defaults</Button>
          </div>
        ) : <p className="text-xs text-muted-foreground">Only super admins can change fees.</p>}
      </Card>

      <Card className="space-y-4 p-6 lg:col-span-2">
        <h2 className="font-display text-lg font-bold text-ink">Preview</h2>
        <Field label="If a job costs (₦)">{(id) => <Input id={id} type="number" min={0} step="500" value={sample} onChange={(event) => setSample(event.target.value)} />}</Field>
        <dl className="space-y-2.5 rounded-xl bg-muted/50 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Agreed price</dt><dd className="font-medium">{nairaExact(price)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Commission</dt><dd className="font-medium text-destructive">− {nairaExact(commission)}</dd></div>
          <div className="flex justify-between border-t border-border pt-2.5"><dt className="font-semibold text-ink">Worker receives</dt><dd className="font-bold text-success">{nairaExact(price - commission)}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">Backend settings are cached for up to 15 seconds, so the bot and worker pick up changes almost immediately.</p>
      </Card>
    </div>
  );
}

export default function FeesPage() {
  const { data, error, loading, reload } = useApi<{ data: Fees }>("admin/fees");
  return (
    <>
      <PageHeader title="Fees" description="Control how much Swiftgigs earns on each job." />
      {loading && <Spinner />}
      {error && <ErrorNote message={error} />}
      {data && <FeeForm key={JSON.stringify(data.data)} fees={data.data} onSaved={reload} />}
    </>
  );
}
