"use client";

import { useMemo, useState } from "react";
import { Database, Pencil, Plus, Trash2 } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Field, Input, Modal, PageHeader, SearchInput, Select, Spinner, Textarea, useAction, useFeedback } from "@/components/ui";
import type { ServiceItem } from "@/lib/types";

const NEW_CATEGORY = "__new__";

function ServiceModal({ service, categories, open, onClose, onSaved }: { service: ServiceItem | null; categories: string[]; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(service?.service || "");
  const [category, setCategory] = useState(service?.category || categories[0] || NEW_CATEGORY);
  const [newCategory, setNewCategory] = useState("");
  const [description, setDescription] = useState(service?.description || "");
  const { run, busy } = useAction();

  const resolvedCategory = category === NEW_CATEGORY ? newCategory.trim() : category;

  const save = async () => {
    const ok = await run(
      () => service
        ? api(`services/${service.slug}`, { method: "PATCH", body: { service: name, category: resolvedCategory, description } })
        : api("services", { method: "POST", body: { service: name, category: resolvedCategory, description } }),
      service ? "Service updated" : "Service added",
    );
    if (ok) { onSaved(); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title={service ? "Edit service" : "Add service"} description="Changes refresh the bot's service cache immediately."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={busy} disabled={!name.trim() || !resolvedCategory} onClick={save}>{service ? "Save changes" : "Add service"}</Button></>}>
      <div className="space-y-4">
        <Field label="Service name" hint="Shown to customers in WhatsApp, e.g. “Plumbing”.">{(id) => <Input id={id} value={name} onChange={(event) => setName(event.target.value)} />}</Field>
        <Field label="Category">
          {(id) => (
            <Select id={id} value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((value) => <option key={value} value={value}>{value}</option>)}
              <option value={NEW_CATEGORY}>＋ New category…</option>
            </Select>
          )}
        </Field>
        {category === NEW_CATEGORY && <Field label="New category name">{(id) => <Input id={id} value={newCategory} onChange={(event) => setNewCategory(event.target.value)} />}</Field>}
        <Field label="Description">{(id) => <Textarea id={id} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />}</Field>
      </div>
    </Modal>
  );
}

export default function ServicesPage() {
  const { data, error, loading, reload } = useApi<{ data: ServiceItem[] }>("services");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [adding, setAdding] = useState(false);
  const { confirm } = useFeedback();
  const { run, busy } = useAction();

  const { grouped, categories } = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const map = new Map<string, ServiceItem[]>();
    for (const item of data?.data || []) {
      if (needle && ![item.service, item.category, item.slug].some((value) => value?.toLowerCase().includes(needle))) continue;
      map.set(item.category, [...(map.get(item.category) || []), item]);
    }
    const allCategories = [...new Set((data?.data || []).map((item) => item.category))].sort((a, b) => a.localeCompare(b));
    return { grouped: [...map.entries()].sort(([a], [b]) => a.localeCompare(b)), categories: allCategories };
  }, [data, search]);

  const remove = async (service: ServiceItem) => {
    const ok = await confirm({ title: `Remove “${service.service}”?`, message: "It will disappear from the bot's service menus. Existing jobs are not affected.", confirmLabel: "Remove", danger: true });
    if (ok && await run(() => api(`services/${service.slug}`, { method: "DELETE" }), "Service removed")) reload();
  };

  const seed = async () => {
    const ok = await confirm({ title: "Seed default catalogue?", message: "Adds or updates the built-in services by slug. Services you created with other slugs are kept." , confirmLabel: "Seed defaults" });
    if (ok && await run(() => api("services/seed", { method: "POST" }), "Default services seeded")) reload();
  };

  return (
    <>
      <PageHeader
        title="Services"
        description="The catalogue of tasks customers can request, grouped by category."
        actions={<><Button variant="secondary" loading={busy} onClick={seed}><Database className="size-4" aria-hidden />Seed defaults</Button><Button onClick={() => setAdding(true)}><Plus className="size-4" aria-hidden />Add service</Button></>}
      />
      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search services…" /></div>

      {loading && <Spinner />}
      {error && <ErrorNote message={error} />}
      {data && !grouped.length && <Card className="py-12 text-center text-sm text-muted-foreground">{data.data.length ? "No services match your search." : "The catalogue is empty. Seed the defaults or add your first service."}</Card>}

      <div className="grid gap-4 lg:grid-cols-2">
        {grouped.map(([category, items]) => (
          <Card key={category} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
              <h2 className="font-display font-bold text-ink">{category}</h2>
              <Badge tone="brand">{items.length}</Badge>
            </div>
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li key={item.slug} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{item.service}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{item.slug}</p>
                    {item.description && <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" aria-label={`Edit ${item.service}`} onClick={() => setEditing(item)}><Pencil className="size-4" /></Button>
                    <Button size="sm" variant="ghost" aria-label={`Remove ${item.service}`} onClick={() => remove(item)}><Trash2 className="size-4 text-destructive" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <ServiceModal key={`add-${adding}`} service={null} categories={categories} open={adding} onClose={() => setAdding(false)} onSaved={reload} />
      <ServiceModal key={editing?.slug ?? "edit"} service={editing} categories={categories} open={Boolean(editing)} onClose={() => setEditing(null)} onSaved={reload} />
    </>
  );
}
