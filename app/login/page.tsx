"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Button, ErrorNote, Field, Input, Spinner } from "@/components/ui";

type Status = { reachable: boolean; hasAdmins: boolean };

function useSetupStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/status")
      .then((response) => response.json())
      .catch(() => ({ reachable: false, hasAdmins: true }))
      .then((result: Status) => { if (!cancelled) setStatus(result); });
    return () => { cancelled = true; };
  }, []);
  return status;
}

export default function LoginPage() {
  const router = useRouter();
  const status = useSetupStatus();
  const [form, setForm] = useState({ name: "", email: "", password: "", setupKey: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const firstRun = status ? !status.hasAdmins : false;
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch(firstRun ? "/api/auth/bootstrap" : "/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    }).catch(() => null);
    const payload = await response?.json().catch(() => null);
    if (response?.ok) {
      router.replace("/");
      router.refresh();
      return;
    }
    setError(payload?.message || "Could not reach the server.");
    setBusy(false);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-24 top-0 size-80 rounded-full bg-primary/[0.09] blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -right-28 bottom-0 size-80 rounded-full bg-primary/[0.07] blur-3xl" aria-hidden />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo-icon.png" alt="Swiftgigs" width={56} height={56} className="mb-4 size-14" priority />
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">{firstRun ? "Set up Swiftgigs Admin" : "Welcome back"}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {firstRun ? "Create the first super admin account." : "Sign in to the operations console."}
          </p>
        </div>

        {!status ? <Spinner /> : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[0_22px_60px_-30px_rgba(88,58,112,0.35)]">
            {status.reachable === false && <ErrorNote message="The Swiftgigs backend is unreachable. Check BACKEND_API_URL." />}
            {firstRun && <Field label="Full name">{(id) => <Input id={id} required value={form.name} onChange={set("name")} autoComplete="name" />}</Field>}
            <Field label="Email">{(id) => <Input id={id} type="email" required value={form.email} onChange={set("email")} autoComplete="email" />}</Field>
            <Field label="Password" hint={firstRun ? "At least 8 characters." : undefined}>
              {(id) => <Input id={id} type="password" required minLength={firstRun ? 8 : undefined} value={form.password} onChange={set("password")} autoComplete={firstRun ? "new-password" : "current-password"} />}
            </Field>
            {firstRun && <Field label="Setup key" hint="Required if ADMIN_SETUP_KEY is set on the backend.">{(id) => <Input id={id} type="password" value={form.setupKey} onChange={set("setupKey")} />}</Field>}
            {error && <ErrorNote message={error} />}
            <Button type="submit" loading={busy} className="w-full">{firstRun ? "Create account" : "Sign in"}</Button>
          </form>
        )}
      </div>
    </main>
  );
}
