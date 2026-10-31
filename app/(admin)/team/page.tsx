"use client";

import { useState } from "react";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { Badge, Button, DataTable, ErrorNote, Field, Input, Modal, PageHeader, Select, useAction, useFeedback } from "@/components/ui";
import type { Column } from "@/components/ui";
import { date } from "@/lib/format";
import { useSession } from "@/components/session";
import type { Admin } from "@/lib/types";

function NewAdminModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "admin" });
  const { run, busy } = useAction();
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async () => {
    if (await run(() => api("admin/admins", { method: "POST", body: form }), "Admin created")) { onSaved(); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add admin"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!form.name.trim() || !form.email.includes("@") || form.password.length < 8} onClick={save}>Create admin</Button></>}>
      <div className="space-y-4">
        <Field label="Full name">{(id) => <Input id={id} value={form.name} onChange={set("name")} />}</Field>
        <Field label="Email">{(id) => <Input id={id} type="email" value={form.email} onChange={set("email")} />}</Field>
        <Field label="Temporary password" hint="At least 8 characters. Share it securely.">{(id) => <Input id={id} type="password" value={form.password} onChange={set("password")} autoComplete="new-password" />}</Field>
        <Field label="Role" hint="Super admins can manage the team and change fees.">
          {(id) => <Select id={id} value={form.role} onChange={set("role")}><option value="admin">Admin</option><option value="super_admin">Super admin</option></Select>}
        </Field>
      </div>
    </Modal>
  );
}

function PasswordModal({ target, onClose }: { target: Admin | null; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const { run, busy } = useAction();
  return (
    <Modal open={Boolean(target)} onClose={() => { setPassword(""); onClose(); }} title="Reset password" description={target?.email}
      footer={<><Button variant="secondary" onClick={() => { setPassword(""); onClose(); }}>Cancel</Button><Button loading={busy} disabled={password.length < 8} onClick={async () => { if (await run(() => api(`admin/admins/${target!._id}`, { method: "PATCH", body: { password } }), "Password updated")) { setPassword(""); onClose(); } }}>Update password</Button></>}>
      <Field label="New password" hint="At least 8 characters.">{(id) => <Input id={id} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />}</Field>
    </Modal>
  );
}

export default function TeamPage() {
  const me = useSession();
  const isSuper = me.role === "super_admin";
  const { data, error, loading, reload } = useApi<Admin[]>(isSuper ? "admin/admins" : null);
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<Admin | null>(null);
  const { confirm } = useFeedback();
  const { run, busy } = useAction();

  if (!isSuper) return <ErrorNote message="Only super admins can manage the admin team." />;

  const patch = (admin: Admin, body: object, message: string) => run(() => api(`admin/admins/${admin._id}`, { method: "PATCH", body }), message).then((ok) => ok && reload());

  const remove = async (admin: Admin) => {
    const ok = await confirm({ title: `Remove ${admin.name}?`, message: "They will immediately lose access. This cannot be undone.", confirmLabel: "Remove", danger: true });
    if (ok && await run(() => api(`admin/admins/${admin._id}`, { method: "DELETE" }), "Admin removed")) reload();
  };

  const columns: Column<Admin>[] = [
    { header: "Admin", cell: (a) => <div><p className="font-medium text-ink">{a.name}{a._id === me._id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</p><p className="text-xs text-muted-foreground">{a.email}</p></div> },
    { header: "Role", cell: (a) => (
      <Select aria-label={`Role for ${a.name}`} value={a.role} disabled={busy || a._id === me._id} className="h-8 w-auto text-xs" onChange={(event) => patch(a, { role: event.target.value }, "Role updated")}>
        <option value="admin">Admin</option><option value="super_admin">Super admin</option>
      </Select>
    ) },
    { header: "Status", cell: (a) => <Badge tone={a.isActive ? "success" : "danger"}>{a.isActive ? "active" : "disabled"}</Badge> },
    { header: "Last sign-in", cell: (a) => <span className="whitespace-nowrap text-muted-foreground">{date(a.lastLoginAt, true)}</span> },
    { header: "", className: "text-right", cell: (a) => a._id === me._id ? null : (
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => patch(a, { isActive: !a.isActive }, a.isActive ? "Admin disabled" : "Admin enabled")}>{a.isActive ? "Disable" : "Enable"}</Button>
        <Button size="sm" variant="ghost" aria-label={`Reset password for ${a.name}`} onClick={() => setResetting(a)}><KeyRound className="size-4" /></Button>
        <Button size="sm" variant="ghost" aria-label={`Remove ${a.name}`} onClick={() => remove(a)}><Trash2 className="size-4 text-destructive" /></Button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Admin team" description="People who can sign in to this console." actions={<Button onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden />Add admin</Button>} />
      <DataTable columns={columns} rows={data} rowKey={(a) => a._id} loading={loading} error={error} />
      <NewAdminModal key={`new-${adding}`} open={adding} onClose={() => setAdding(false)} onSaved={reload} />
      <PasswordModal key={resetting?._id ?? "pw"} target={resetting} onClose={() => setResetting(null)} />
    </>
  );
}
