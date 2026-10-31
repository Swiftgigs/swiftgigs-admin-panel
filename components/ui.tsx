"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/* ---------------------------------- button --------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
};

const buttonVariants = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
  secondary: "bg-card border border-border text-foreground hover:bg-muted",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

export const buttonClass = (variant: keyof typeof buttonVariants = "primary", size: "sm" | "md" = "md") =>
  cx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap",
    size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
    buttonVariants[variant],
  );

export function Button({ variant = "primary", size = "md", loading, children, disabled, className, ...props }: ButtonProps) {
  return (
    <button type="button" {...props} disabled={disabled || loading} className={cx(buttonClass(variant, size), className)}>
      {loading && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", size = "md", children }: { href: string; variant?: keyof typeof buttonVariants; size?: "sm" | "md"; children: ReactNode }) {
  return (
    <Link href={href} className={buttonClass(variant, size)}>
      {children}
    </Link>
  );
}

/* ----------------------------------- cards --------------------------------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("rounded-xl border border-border bg-card", className)}>{children}</div>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, href, tone }: { label: string; value: ReactNode; hint?: string; href?: string; tone?: "alert" }) {
  const body = (
    <Card className={cx("h-full p-4 transition-colors", href && "hover:border-primary/40", tone === "alert" && "border-destructive/30 bg-destructive/[0.03]")}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cx("mt-2 font-display text-3xl font-bold tracking-tight", tone === "alert" ? "text-destructive" : "text-ink")}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/* ----------------------------------- badges -------------------------------- */

const tones = {
  neutral: "bg-muted text-muted-foreground",
  brand: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone])}>{children}</span>;
}

const statusTones: Record<string, Tone> = {
  verified: "success", pass: "success", active: "success", online: "success", published: "success", released: "success", completed: "success", resolved: "success", allow: "success",
  failed: "danger", fail: "danger", disputed: "danger", cancelled: "danger", block: "danger", refunded: "danger", banned: "danger",
  review: "warning", step_up_required: "warning", step_up: "warning", pending: "warning", busy: "warning", draft: "warning", funded: "brand", paused: "warning", partially_released: "brand",
  awaiting_provider_evidence: "warning", awaiting_customer_care_review: "brand", open: "danger",
};

export function StatusBadge({ value }: { value: string | undefined | null }) {
  const key = value || "unknown";
  return <Badge tone={statusTones[key] || "neutral"}>{key.replace(/_/g, " ")}</Badge>;
}

/* ----------------------------------- forms --------------------------------- */

const fieldBase = "rounded-lg border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-muted disabled:opacity-70";

// Fields fill their container unless the caller sets an explicit width (e.g. w-auto in filter bars).
const widthClass = (className?: string) => (className && /(^|\s)w-/.test(className) ? "" : "w-full");

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-ink">{label}</label>
      {children(id)}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(fieldBase, "h-10", widthClass(className), className)} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(fieldBase, "h-10 pr-8", widthClass(className), className)}>{children}</select>;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(fieldBase, "py-2.5 leading-relaxed", widthClass(className), className)} />;
}

export function SearchInput({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input type="search" aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

/* ---------------------------------- tabs ----------------------------------- */

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" className="mb-5 flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cx(
            "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            value === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- tables --------------------------------- */

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

export function DataTable<T>({ columns, rows, rowKey, loading, error, empty = "Nothing here yet.", onRowClick }: {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string;
  empty?: string;
  onRowClick?: (row: T) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column.header} scope="col" className={cx("px-4 py-2.5 font-semibold whitespace-nowrap", column.className)}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className={cx("divide-y divide-border", loading && rows && "opacity-50")}>
            {rows?.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cx("align-middle", onRowClick && "cursor-pointer hover:bg-muted/40")}
              >
                {columns.map((column) => (
                  <td key={column.header} className={cx("px-4 py-3", column.className)}>{column.cell(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && !rows && <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden />Loading…</div>}
      {error && <div className="flex items-center justify-center gap-2 py-12 text-sm text-destructive"><AlertCircle className="size-4" aria-hidden />{error}</div>}
      {!loading && !error && rows?.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">{empty}</div>}
    </Card>
  );
}

export function Pagination({ page, limit, total, onPage }: { page: number; limit: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (total <= limit) return total ? <p className="mt-3 text-xs text-muted-foreground">{total} result{total === 1 ? "" : "s"}</p> : null;
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
      <span>{(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
        <span className="px-2">Page {page} of {pages}</span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden />{label}</div>;
}

export function ErrorNote({ message }: { message: string }) {
  return <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" aria-hidden />{message}</div>;
}

/* ---------------------------------- modal ---------------------------------- */

export function Modal({ open, onClose, title, description, children, footer, wide }: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => { if (event.target === ref.current) onClose(); }}
      className={cx("m-auto max-h-[90vh] w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl", wide ? "max-w-3xl" : "max-w-lg")}
    >
      {open && (
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
              {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="size-5" /></button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-6 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

type ConfirmOptions = { title: string; message: string; confirmLabel?: string; danger?: boolean };
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

/* ------------------------- toast + confirm provider ------------------------ */

type Toast = { id: number; kind: "success" | "error"; message: string };
type FeedbackContext = { toast: (kind: Toast["kind"], message: string) => void; confirm: (options: ConfirmOptions) => Promise<boolean> };

const Feedback = createContext<FeedbackContext | null>(null);

export function useFeedback(): FeedbackContext {
  const ctx = useContext(Feedback);
  if (!ctx) throw new Error("useFeedback must be used inside <FeedbackProvider>");
  return ctx;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const nextId = useRef(1);

  const toast = useCallback((kind: Toast["kind"], message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, kind, message }]);
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4500);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })), []);

  const settle = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <Feedback.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className={cx("pointer-events-auto flex max-w-sm items-start gap-2 rounded-lg border bg-card px-4 py-3 text-sm shadow-lg", item.kind === "error" ? "border-destructive/40" : "border-success/40")}>
            {item.kind === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />}
            <span>{item.message}</span>
          </div>
        ))}
      </div>
      <Modal
        open={Boolean(pending)}
        onClose={() => settle(false)}
        title={pending?.title || ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>Cancel</Button>
            <Button variant={pending?.danger ? "danger" : "primary"} onClick={() => settle(true)}>{pending?.confirmLabel || "Confirm"}</Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">{pending?.message}</p>
      </Modal>
    </Feedback.Provider>
  );
}

/* Runs an async action, surfacing success / failure as toasts. Returns true on success. */
export function useAction() {
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (action: () => Promise<unknown>, successMessage?: string): Promise<boolean> => {
    setBusy(true);
    try {
      await action();
      if (successMessage) toast("success", successMessage);
      return true;
    } catch (error) {
      toast("error", (error as Error).message || "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [toast]);
  return { run, busy };
}
