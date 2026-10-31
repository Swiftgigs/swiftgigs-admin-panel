"use client";

import { createContext, useContext } from "react";
import type { Admin } from "@/lib/types";

export const SessionContext = createContext<Admin | null>(null);

export function useSession(): Admin {
  const admin = useContext(SessionContext);
  if (!admin) throw new Error("useSession must be used inside the admin shell");
  return admin;
}
