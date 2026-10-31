"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { api, qs, useApi, useDebounced } from "@/lib/api";
import { Badge, Button, DataTable, LinkButton, PageHeader, Pagination, SearchInput, Select, StatusBadge, useAction, useFeedback } from "@/components/ui";
import type { Column } from "@/components/ui";
import { date } from "@/lib/format";
import type { BlogPost, Paged } from "@/lib/types";

const LIMIT = 20;

export default function BlogPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const { data, error, loading, reload } = useApi<Paged<BlogPost>>(`admin/blog${qs({ q, status, page, limit: LIMIT })}`);
  const { confirm } = useFeedback();
  const { run } = useAction();

  const remove = async (post: BlogPost) => {
    const ok = await confirm({ title: "Delete this post?", message: `“${post.title}” will be permanently deleted and disappear from the website. Consider archiving instead.`, confirmLabel: "Delete", danger: true });
    if (ok && await run(() => api(`admin/blog/${post._id}`, { method: "DELETE" }), "Post deleted")) reload();
  };

  const columns: Column<BlogPost>[] = [
    { header: "Title", cell: (post) => <Link href={`/blog/${post._id}`} className="block max-w-md"><p className="truncate font-medium text-ink hover:text-primary">{post.title}</p><p className="truncate font-mono text-[11px] text-muted-foreground">/blog/{post.slug}</p></Link> },
    { header: "Category", cell: (post) => <Badge tone="brand">{post.category}</Badge> },
    { header: "Status", cell: (post) => <StatusBadge value={post.status} /> },
    { header: "Read time", cell: (post) => <span className="text-muted-foreground">{post.read_time_minutes} min</span> },
    { header: "Published", cell: (post) => <span className="whitespace-nowrap text-muted-foreground">{date(post.published_at)}</span> },
    { header: "Updated", cell: (post) => <span className="whitespace-nowrap text-muted-foreground">{date(post.updatedAt)}</span> },
    { header: "", className: "text-right", cell: (post) => <Button size="sm" variant="ghost" aria-label={`Delete ${post.title}`} onClick={() => remove(post)}><Trash2 className="size-4 text-destructive" /></Button> },
  ];

  return (
    <>
      <PageHeader
        title="Blog"
        description="Articles for the Swiftgigs website. Published posts are served from the public /blog/posts API that the landing page reads."
        actions={<LinkButton href="/blog/new"><Plus className="size-4" aria-hidden />New post</LinkButton>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search title, slug, tag…" />
        <Select aria-label="Status filter" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="w-auto">
          <option value="">All posts</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
          <option value="archived">Archived</option>
        </Select>
      </div>
      <DataTable columns={columns} rows={data?.data} rowKey={(post) => post._id} loading={loading} error={error} empty="No posts yet. Write your first article." />
      {data && <Pagination page={page} limit={LIMIT} total={data.total} onPage={setPage} />}
    </>
  );
}
