"use client";

import { Toaster as Sonner } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";

export function Toaster() {
  return (
    <Sonner
      theme="light"
      richColors
      closeButton
      position="bottom-right"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-5" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          error:
            "border-red-900 bg-red-700 text-white shadow-lg shadow-red-950/40 [&_[data-icon]]:text-white [&_[data-close-button]]:border-red-900 [&_[data-close-button]]:bg-red-800 [&_[data-close-button]]:text-white",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--error-bg": "#b91c1c",
          "--error-text": "#ffffff",
          "--error-border": "#7f1d1d",
        } as React.CSSProperties
      }
    />
  );
}
