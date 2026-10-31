"use client";

import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const BASE = "/api/backend";

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE}/${path.replace(/^\/+/, "")}`, {
      method: init.method || "GET",
      headers: init.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("Network error. Check your connection.", 0);
  }

  const payload = await response.json().catch(() => null);
  if (response.status === 401 && typeof window !== "undefined" && window.location.pathname !== "/login") {
    // Hard navigation on purpose: drops all client state once the session is gone.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }
  if (!response.ok) {
    throw new ApiError(payload?.message || `Request failed (${response.status})`, response.status);
  }
  return payload as T;
}

type State<T> = { key: string; data?: T; error?: string };

// `path` of null skips the request. Loading is derived (no completed result for the current key), so
// switching filters shows the spinner without setting state synchronously inside the effect.
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ key: "" });
  const [reloads, setReloads] = useState(0);
  const key = path === null ? "" : `${path}#${reloads}`;

  useEffect(() => {
    if (path === null) return;
    const controller = new AbortController();
    api<T>(path, { signal: controller.signal })
      .then((data) => setState({ key, data }))
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState({ key, error: error.message });
      });
    return () => controller.abort();
  }, [path, key]);

  const reload = useCallback(() => setReloads((count) => count + 1), []);
  const settled = state.key === key;
  return {
    data: state.data,
    error: settled ? state.error : undefined,
    loading: path !== null && !settled,
    reload,
  };
}

export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(name, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
