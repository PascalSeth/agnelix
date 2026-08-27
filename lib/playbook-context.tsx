"use client"

import React, { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PlaybookConfig } from "./playbook-defaults";

// Re-export so existing `import { PlaybookConfig } from "@/lib/playbook-context"` keeps working
export type { PlaybookConfig } from "./playbook-defaults";

interface PlaybookContextType {
  activeType: string;
  activePlaybook: PlaybookConfig | null;
  playbooks: PlaybookConfig[];
  changePlaybook: (type: string) => Promise<void>;
  isPending: boolean;
}

const PlaybookContext = createContext<PlaybookContextType | null>(null);

export function PlaybookProvider({
  children,
  initialType,
  playbooks,
}: {
  children: React.ReactNode;
  initialType: string;
  // Fully merged server-side (DB rows over defaults) in app/(dashboard)/layout.tsx
  // via mergePlaybooksWithDefaults — the default data no longer ships in the bundle.
  playbooks: PlaybookConfig[];
}) {
  const [activeType, setActiveType] = useState(initialType || "sales");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const activePlaybook =
    playbooks.find((p) => p.type === activeType) ||
    playbooks.find((p) => p.type === "sales") ||
    playbooks[0] ||
    null;

  const changePlaybook = async (type: string) => {
    startTransition(async () => {
      // Optimistic update
      setActiveType(type);
      try {
        const response = await fetch("/api/user/playbook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playbookType: type }),
        });
        if (response.ok) {
          router.refresh();
        }
      } catch (err) {
        console.error("Failed to update playbook type in database:", err);
      }
    });
  };

  return (
    <PlaybookContext.Provider
      value={{
        activeType,
        activePlaybook,
        playbooks,
        changePlaybook,
        isPending,
      }}
    >
      {children}
    </PlaybookContext.Provider>
  );
}

export function usePlaybook() {
  const context = useContext(PlaybookContext);
  if (!context) {
    throw new Error("usePlaybook must be used within a PlaybookProvider");
  }
  return context;
}
