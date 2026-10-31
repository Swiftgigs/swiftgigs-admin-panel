"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { api, useApi } from "@/lib/api";
import { Badge, Button, Card, ErrorNote, Field, Input, Select, Spinner, StatusBadge, Textarea, cx, useAction, useFeedback } from "@/components/ui";
import { renderMarkdown } from "@/lib/markdown";
import { toDateInput } from "@/lib/format";
import type { BlogPost } from "@/lib/types";

const slugify = (value: string) =>
  value.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);

type Draft = {
  title: string; slug: string; excerpt: string; content: string; category: string; tags: string;
  cover_image_url: string; author_name: string; seo_title: string; seo_description: string;
  status: BlogPost["status"]; published_at: string;
};

const blank: Draft = {
  title: "", slug: "", excerpt: "", content: "", category: "General", tags: "", cover_image_url: "",
  author_name: "Swiftgigs Team", seo_title: "", seo_description: "", status: "draft", published_at: "",
};

const fromPost = (post: BlogPost): Draft => ({
  title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content || "", category: post.category,
  tags: post.tags.join(", "), cover_image_url: post.cover_image_url, author_name: post.author_name,
  seo_title: post.seo_title, seo_description: post.seo_description, status: post.status, published_at: toDateInput(post.published_at),
});

function Editor({ id, initial, categories }: { id: string; initial: Draft; categories: string[] }) {
  const router = useRouter();
  const isNew = id === "new";
  const [draft, setDraft] = useState<Draft>(initial);
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [view, setView] = useState<"write" | "preview">("write");
  const { run, busy } = useAction();
  const { toast } = useFeedback();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const preview = useMemo(() => renderMarkdown(draft.content), [draft.content]);

  const save = async (status?: BlogPost["status"]) => {
    if (!draft.title.trim()) { toast("error", "Add a title first."); return; }
    const body = {
      ...draft,
      slug: draft.slug || slugify(draft.title),
      tags: draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      status: status || draft.status,
      published_at: draft.published_at ? new Date(draft.published_at).toISOString() : undefined,
    };
    let savedId = id;
    const ok = await run(async () => {
      const response = await api<{ data: BlogPost }>(isNew ? "admin/blog" : `admin/blog/${id}`, { method: isNew ? "POST" : "PATCH", body });
      savedId = response.data._id;
      if (!isNew) setDraft((current) => ({ ...current, status: response.data.status, published_at: toDateInput(response.data.published_at), slug: response.data.slug }));
    }, status === "published" ? "Published" : "Saved");
    if (ok && isNew) router.replace(`/blog/${savedId}`);
  };

  return (
    <>
      <datalist id="blog-categories">{categories.map((value) => <option key={value} value={value} />)}</datalist>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/blog" className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Back to posts"><ArrowLeft className="size-5" /></Link>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{isNew ? "New post" : "Edit post"}</h1>
          <StatusBadge value={draft.status} />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" loading={busy} onClick={() => save()}>Save</Button>
          {draft.status === "published"
            ? <Button variant="secondary" loading={busy} onClick={() => save("archived")}>Archive</Button>
            : <Button loading={busy} onClick={() => save("published")}>Publish</Button>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Field label="Title">{(fid) => <Input id={fid} value={draft.title} onChange={(event) => { set("title", event.target.value); if (!slugTouched) set("slug", slugify(event.target.value)); }} className="h-12 text-base font-semibold" />}</Field>
          <Field label="Excerpt" hint="One or two sentences shown on listing cards and in search results.">{(fid) => <Textarea id={fid} rows={2} value={draft.excerpt} onChange={(event) => set("excerpt", event.target.value)} />}</Field>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
              <span className="text-xs font-semibold text-ink">Content <span className="font-normal text-muted-foreground">· Markdown</span></span>
              <div className="flex gap-1" role="tablist">
                {([["write", Pencil, "Write"], ["preview", Eye, "Preview"]] as const).map(([key, Icon, label]) => (
                  <button key={key} role="tab" aria-selected={view === key} type="button" onClick={() => setView(key)}
                    className={cx("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium", view === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
                    <Icon className="size-3.5" aria-hidden />{label}
                  </button>
                ))}
              </div>
            </div>
            {view === "write"
              ? <textarea aria-label="Post content" value={draft.content} onChange={(event) => set("content", event.target.value)} rows={22} placeholder={"## A heading\n\nWrite in Markdown. **Bold**, *italic*, [links](https://swiftgigs.com.ng), lists and quotes are supported."} className="block w-full resize-y bg-card p-4 font-mono text-sm leading-relaxed focus:outline-none" />
              : <div className="prose-preview min-h-[28rem] p-5 sm:p-8">{draft.content.trim() ? <div dangerouslySetInnerHTML={{ __html: preview }} /> : <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>}</div>}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="space-y-4 p-4">
            <Field label="URL slug" hint={`swiftgigs.com.ng/blog/${draft.slug || "…"}`}>{(fid) => <Input id={fid} value={draft.slug} onChange={(event) => { setSlugTouched(true); set("slug", slugify(event.target.value)); }} className="font-mono text-xs" />}</Field>
            <Field label="Category">
              {(fid) => <Input id={fid} list="blog-categories" value={draft.category} onChange={(event) => set("category", event.target.value)} />}
            </Field>
            <Field label="Tags" hint="Comma separated.">{(fid) => <Input id={fid} value={draft.tags} onChange={(event) => set("tags", event.target.value)} />}</Field>
            <Field label="Author">{(fid) => <Input id={fid} value={draft.author_name} onChange={(event) => set("author_name", event.target.value)} />}</Field>
            <Field label="Status">
              {(fid) => (
                <Select id={fid} value={draft.status} onChange={(event) => set("status", event.target.value as Draft["status"])}>
                  <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
                </Select>
              )}
            </Field>
            <Field label="Publish date" hint="Future dates stay hidden from the site until then.">{(fid) => <Input id={fid} type="date" value={draft.published_at} onChange={(event) => set("published_at", event.target.value)} />}</Field>
          </Card>

          <Card className="space-y-4 p-4">
            <Field label="Cover image URL">{(fid) => <Input id={fid} type="url" value={draft.cover_image_url} onChange={(event) => set("cover_image_url", event.target.value)} placeholder="https://…" />}</Field>
            {draft.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URL entered by an admin
              <img src={draft.cover_image_url} alt="Cover preview" className="aspect-video w-full rounded-lg border border-border object-cover" />
            )}
          </Card>

          <Card className="space-y-4 p-4">
            <h2 className="text-xs font-semibold text-ink">Search appearance</h2>
            <Field label="SEO title" hint={`${draft.seo_title.length}/60`}>{(fid) => <Input id={fid} value={draft.seo_title} maxLength={70} onChange={(event) => set("seo_title", event.target.value)} placeholder={draft.title} />}</Field>
            <Field label="Meta description" hint={`${draft.seo_description.length}/160`}>{(fid) => <Textarea id={fid} rows={3} maxLength={200} value={draft.seo_description} onChange={(event) => set("seo_description", event.target.value)} placeholder={draft.excerpt} />}</Field>
          </Card>
          {!isNew && <p className="px-1 text-xs text-muted-foreground"><Badge>auto</Badge> Read time is recalculated from the content on every save.</p>}
        </aside>
      </div>
    </>
  );
}

export default function BlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const { data, error, loading } = useApi<{ data: BlogPost }>(isNew ? null : `admin/blog/${id}`);
  const { data: list } = useApi<{ data: BlogPost[] }>("admin/blog?limit=100");
  const categories = useMemo(() => [...new Set([...(list?.data || []).map((post) => post.category), "General", "Guides", "Safety", "Company"])].sort(), [list]);

  if (!isNew && loading) return <Spinner />;
  if (!isNew && (error || !data)) return <ErrorNote message={error || "Post not found."} />;
  return <Editor key={id} id={id} initial={isNew ? blank : fromPost(data!.data)} categories={categories} />;
}
