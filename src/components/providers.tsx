"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { IdleLogout } from "@/components/idle-logout";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <IdleLogout />
      {children}
      <Toaster />
    </TooltipProvider>
  );
}
