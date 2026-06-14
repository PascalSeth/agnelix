/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import React, { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export interface PlaybookConfig {
  id: string;
  type: string;
  name: string;
  targetVerticals: string[];
  discoveryMethod: string;
  platformOptions: string[] | null;
  sequenceTemplates: Array<{ id: string; name: string; steps: number; description: string }>;
  proposalTemplates: Array<{ id: string; name: string; description: string; price: number; setupPrice: number; period: string; currency: string }>;
  reportMetrics: string[];
  reportTemplates: Array<{ id: string; name: string; description: string }>;
  portalTemplates: Array<{ id: string; name: string; description: string }>;
  portalSections: string[];
  toneOptions: string[];
  objectionHandlers: Array<{ objection: string; response: string }>;
}

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
  playbooks: any[];
}) {
  const [activeType, setActiveType] = useState(initialType || "sales");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const DEFAULT_PLAYBOOKS = [
    { id: "1", type: "social_media", name: "Social Media Agency", targetVerticals: [], discoveryMethod: "instagram", platformOptions: null, sequenceTemplates: [], proposalTemplates: [], reportMetrics: [], reportTemplates: [], portalTemplates: [], portalSections: [], toneOptions: [], objectionHandlers: [] },
    { id: "2", type: "seo", name: "SEO Agency", targetVerticals: [], discoveryMethod: "google", platformOptions: null, sequenceTemplates: [], proposalTemplates: [], reportMetrics: [], reportTemplates: [], portalTemplates: [], portalSections: [], toneOptions: [], objectionHandlers: [] },
    { id: "3", type: "ppc", name: "PPC & Paid Ads Agency", targetVerticals: [], discoveryMethod: "linkedin", platformOptions: null, sequenceTemplates: [], proposalTemplates: [], reportMetrics: [], reportTemplates: [], portalTemplates: [], portalSections: [], toneOptions: [], objectionHandlers: [] },
    { id: "4", type: "sales", name: "Sales & B2B Lead Gen", targetVerticals: [], discoveryMethod: "linkedin", platformOptions: null, sequenceTemplates: [], proposalTemplates: [], reportMetrics: [], reportTemplates: [], portalTemplates: [], portalSections: [], toneOptions: [], objectionHandlers: [] },
    { id: "5", type: "finance", name: "Fractional CFO & Finance", targetVerticals: [], discoveryMethod: "linkedin", platformOptions: null, sequenceTemplates: [], proposalTemplates: [], reportMetrics: [], reportTemplates: [], portalTemplates: [], portalSections: [], toneOptions: [], objectionHandlers: [] },
    { id: "6", type: "web_design", name: "Web Design & Development", targetVerticals: [], discoveryMethod: "google", platformOptions: null, sequenceTemplates: [], proposalTemplates: [], reportMetrics: [], reportTemplates: [], portalTemplates: [], portalSections: [], toneOptions: [], objectionHandlers: [] },
  ] as PlaybookConfig[]

  // Cast JSON type fields safely, or use defaults if empty
  const typedPlaybooks = playbooks.length > 0 ? (playbooks.map((p) => ({
    ...p,
    targetVerticals: typeof p.targetVerticals === "string" ? JSON.parse(p.targetVerticals) : p.targetVerticals,
    platformOptions: typeof p.platformOptions === "string" ? JSON.parse(p.platformOptions) : p.platformOptions,
    sequenceTemplates: typeof p.sequenceTemplates === "string" ? JSON.parse(p.sequenceTemplates) : p.sequenceTemplates,
    proposalTemplates: typeof p.proposalTemplates === "string" ? JSON.parse(p.proposalTemplates) : p.proposalTemplates,
    reportMetrics: typeof p.reportMetrics === "string" ? JSON.parse(p.reportMetrics) : p.reportMetrics,
    reportTemplates: typeof p.reportTemplates === "string" ? JSON.parse(p.reportTemplates) : p.reportTemplates,
    portalTemplates: typeof p.portalTemplates === "string" ? JSON.parse(p.portalTemplates) : p.portalTemplates,
    portalSections: typeof p.portalSections === "string" ? JSON.parse(p.portalSections) : p.portalSections,
    toneOptions: typeof p.toneOptions === "string" ? JSON.parse(p.toneOptions) : p.toneOptions,
    objectionHandlers: typeof p.objectionHandlers === "string" ? JSON.parse(p.objectionHandlers) : p.objectionHandlers,
  })) as PlaybookConfig[]) : DEFAULT_PLAYBOOKS;

  const activePlaybook = typedPlaybooks.find((p) => p.type === activeType) || typedPlaybooks.find((p) => p.type === "sales") || null;

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
        playbooks: typedPlaybooks,
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
