"use client";

import { PreferencesProvider } from "@/contexts";

export function Providers({ children }: { children: React.ReactNode }) {
  return <PreferencesProvider>{children}</PreferencesProvider>;
}
