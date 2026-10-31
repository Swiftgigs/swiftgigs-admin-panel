export const naira = (amount: number | undefined | null): string =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount || 0);

export const nairaExact = (amount: number): string =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(amount);

export const number = (value: number | undefined | null): string => new Intl.NumberFormat("en-NG").format(value || 0);

export function date(value: string | Date | undefined | null, withTime = false): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NG", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(parsed);
}

export const humanize = (value: string | undefined | null): string =>
  (value || "").replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase()) || "—";

export const toDateInput = (value: string | Date | undefined | null): string => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

export const shortId = (id: string | undefined | null): string => (id ? `…${String(id).slice(-6)}` : "—");
