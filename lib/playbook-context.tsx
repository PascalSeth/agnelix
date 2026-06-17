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
    { 
      id: "1", type: "social_media", name: "Social Media Agency", targetVerticals: ["E-commerce", "Local Business", "SaaS"], discoveryMethod: "instagram", platformOptions: ["Instagram", "TikTok", "LinkedIn"], 
      sequenceTemplates: [
        { id: "s1", name: "Direct Value Hook", steps: 3, description: "Lead with a free 3-post mockup audit." },
        { id: "s2", name: "Competitor Strategy", steps: 3, description: "Mention what their competitor is doing better." }
      ], 
      proposalTemplates: [
        { id: "p1", name: "Starter Management", description: "3 posts a week + community management", price: 750, setupPrice: 250, period: "monthly", currency: "GBP" },
        { id: "p2", name: "Growth + Ads", description: "5 posts + $1k ad spend management", price: 1500, setupPrice: 500, period: "monthly", currency: "GBP" }
      ], 
      reportMetrics: ["Reach", "Engagement Rate", "Follower Growth"], reportTemplates: [], portalTemplates: [], portalSections: [], toneOptions: ["Creative", "Professional", "Gen-Z"], 
      objectionHandlers: [
        { objection: "We do it in-house", response: "Acknowledge their effort, ask if their in-house team has time to keep up with the latest algorithm changes, offer a quick free audit to give them ideas." },
        { objection: "No budget", response: "Ask if they'd be open to a purely performance-based pilot or point out the cost of missed traffic." }
      ] 
    },
    { 
      id: "2", type: "seo", name: "SEO Agency", targetVerticals: ["Lawyers", "Dentists", "Plumbers"], discoveryMethod: "google", platformOptions: ["Google My Business", "On-page SEO", "Backlinks"], 
      sequenceTemplates: [
        { id: "s1", name: "Speed Audit Approach", steps: 4, description: "Cold email pointing out specific site speed issues." },
        { id: "s2", name: "Local Maps Approach", steps: 3, description: "Mention they are ranking 5th in their city for a key term." }
      ], 
      proposalTemplates: [
        { id: "p1", name: "Local SEO Dominance", description: "GMB optimization, 3 local citations/mo, on-page fixes", price: 800, setupPrice: 0, period: "monthly", currency: "GBP" },
        { id: "p2", name: "National Authority", description: "10 high-DR backlinks, 4 content pieces/mo", price: 2500, setupPrice: 1000, period: "monthly", currency: "GBP" }
      ], 
      reportMetrics: ["Organic Traffic", "Keyword Rankings", "Domain Authority"], reportTemplates: [], portalTemplates: [], portalSections: [], toneOptions: ["Data-driven", "Direct"], 
      objectionHandlers: [
        { objection: "SEO takes too long", response: "Agree it's a long-term play, but explain that we target 'low hanging fruit' keywords for wins in the first 30 days." },
        { objection: "We tried SEO and got burned", response: "Validate their frustration. Explain our transparent reporting and offer a short 3-month trial without long lock-ins." }
      ] 
    },
    { 
      id: "3", type: "ppc", name: "PPC & Paid Ads Agency", targetVerticals: ["E-commerce", "B2B SaaS"], discoveryMethod: "linkedin", platformOptions: ["Google Ads", "Meta Ads", "LinkedIn Ads"], 
      sequenceTemplates: [
        { id: "s1", name: "Ad Library Teardown", steps: 3, description: "Mention you saw their ads in the FB Ad Library and noticed an optimization." }
      ], 
      proposalTemplates: [
        { id: "p1", name: "Google Ads Management", description: "Search & Display management up to $5k spend", price: 1000, setupPrice: 500, period: "monthly", currency: "GBP" },
        { id: "p2", name: "Omni-channel Scaling", description: "Meta + Google Ads up to $20k spend", price: 2500, setupPrice: 1000, period: "monthly", currency: "GBP" }
      ], 
      reportMetrics: ["ROAS", "Cost per Lead", "Click-through Rate"], reportTemplates: [], portalTemplates: [], portalSections: [], toneOptions: ["Direct", "Results-oriented"], 
      objectionHandlers: [
        { objection: "We wasted money on ads before", response: "Explain that tracking or creative was likely the issue. Offer a free ad account audit to show exactly where the money leaked." },
        { objection: "Leads were low quality", response: "Discuss our lead qualification process and CRM integration to optimize for closed revenue, not just clicks." }
      ] 
    },
    { 
      id: "4", type: "sales", name: "Sales & B2B Lead Gen", targetVerticals: ["Agencies", "SaaS", "Consultants"], discoveryMethod: "linkedin", platformOptions: ["Cold Email", "LinkedIn", "Cold Call"], 
      sequenceTemplates: [
        { id: "s1", name: "Direct Pitch", steps: 4, description: "Short, punchy 3-sentence email asking if they have capacity for more clients." }
      ], 
      proposalTemplates: [
        { id: "p1", name: "Cold Email Infrastructure", description: "Domain setup, warmup, and sequence copywriting", price: 1500, setupPrice: 1500, period: "one-off", currency: "GBP" },
        { id: "p2", name: "Done-for-you Meeting Booking", description: "We handle inbox management and book 10+ qualified calls/mo", price: 3000, setupPrice: 500, period: "monthly", currency: "GBP" }
      ], 
      reportMetrics: ["Emails Sent", "Open Rate", "Meetings Booked"], reportTemplates: [], portalTemplates: [], portalSections: [], toneOptions: ["Punchy", "Conversational", "Direct"], 
      objectionHandlers: [
        { objection: "We get our leads from referrals", response: "Referrals are great but unpredictable. Ask if they want a predictable lever to turn on when referrals dry up." },
        { objection: "Cold email is dead / spammy", response: "Explain the difference between spam and highly targeted, relevant, personalized outreach using signals." }
      ] 
    },
    { 
      id: "5", type: "finance", name: "Fractional CFO & Finance", targetVerticals: ["Startups", "Series A", "Agencies"], discoveryMethod: "linkedin", platformOptions: ["Financial Modeling", "Bookkeeping"], 
      sequenceTemplates: [
        { id: "s1", name: "Cash Flow Audit", steps: 3, description: "Offer a free 30-minute cashflow efficiency audit." }
      ], 
      proposalTemplates: [
        { id: "p1", name: "Bookkeeping & Compliance", description: "Monthly reconciliation, payroll, and basic tax compliance", price: 600, setupPrice: 200, period: "monthly", currency: "GBP" },
        { id: "p2", name: "Fractional CFO", description: "Weekly advisory, cash flow forecasting, board deck prep", price: 2500, setupPrice: 0, period: "monthly", currency: "GBP" }
      ], 
      reportMetrics: ["Burn Rate", "Runway", "Gross Margin"], reportTemplates: [], portalTemplates: [], portalSections: [], toneOptions: ["Professional", "Trustworthy"], 
      objectionHandlers: [
        { objection: "We already have a CPA", response: "Acknowledge the CPA is great for taxes, but explain you provide forward-looking strategic forecasting, not just backward-looking tax prep." },
        { objection: "We are too small for a CFO", response: "Explain that setting up the right financial models early saves expensive cleanups later." }
      ] 
    },
    { 
      id: "6", type: "web_design", name: "Web Design & Development", targetVerticals: ["Local Business", "E-commerce"], discoveryMethod: "google", platformOptions: ["Shopify", "WordPress", "Webflow"], 
      sequenceTemplates: [
        { id: "s1", name: "UX Teardown", steps: 3, description: "Record a 2-minute Loom pointing out a conversion leak on their current site." }
      ], 
      proposalTemplates: [
        { id: "p1", name: "Conversion Landing Page", description: "Single high-converting page design + build", price: 1500, setupPrice: 1500, period: "one-off", currency: "GBP" },
        { id: "p2", name: "Full E-Commerce Build", description: "Custom Shopify store, up to 50 products, SEO optimized", price: 5000, setupPrice: 5000, period: "one-off", currency: "GBP" },
        { id: "p3", name: "Website Maintenance Retainer", description: "Hosting, security updates, minor edits", price: 150, setupPrice: 0, period: "monthly", currency: "GBP" }
      ], 
      reportMetrics: ["Site Speed", "Conversion Rate", "Uptime"], reportTemplates: [], portalTemplates: [], portalSections: [], toneOptions: ["Creative", "Modern"], 
      objectionHandlers: [
        { objection: "We can just use Wix or Squarespace", response: "Explain that those platforms are fine for beginners, but custom solutions provide faster load times, better SEO, and higher conversion rates." },
        { objection: "Our current site is fine", response: "Ask what their current conversion rate is. Explain that even a 0.5% increase can double their revenue depending on traffic." }
      ] 
    }
  ] as PlaybookConfig[]

  // Cast JSON type fields safely, or use defaults if empty
  const typedPlaybooks = DEFAULT_PLAYBOOKS.map((defaultPlaybook) => {
    const dbPlaybook = playbooks.find((p) => p.type === defaultPlaybook.type);
    if (!dbPlaybook) return defaultPlaybook;
    
    return {
      ...dbPlaybook,
      targetVerticals: typeof dbPlaybook.targetVerticals === "string" ? JSON.parse(dbPlaybook.targetVerticals) : dbPlaybook.targetVerticals,
      platformOptions: typeof dbPlaybook.platformOptions === "string" ? JSON.parse(dbPlaybook.platformOptions) : dbPlaybook.platformOptions,
      sequenceTemplates: typeof dbPlaybook.sequenceTemplates === "string" ? JSON.parse(dbPlaybook.sequenceTemplates) : dbPlaybook.sequenceTemplates,
      proposalTemplates: typeof dbPlaybook.proposalTemplates === "string" ? JSON.parse(dbPlaybook.proposalTemplates) : dbPlaybook.proposalTemplates,
      reportMetrics: typeof dbPlaybook.reportMetrics === "string" ? JSON.parse(dbPlaybook.reportMetrics) : dbPlaybook.reportMetrics,
      reportTemplates: typeof dbPlaybook.reportTemplates === "string" ? JSON.parse(dbPlaybook.reportTemplates) : dbPlaybook.reportTemplates,
      portalTemplates: typeof dbPlaybook.portalTemplates === "string" ? JSON.parse(dbPlaybook.portalTemplates) : dbPlaybook.portalTemplates,
      portalSections: typeof dbPlaybook.portalSections === "string" ? JSON.parse(dbPlaybook.portalSections) : dbPlaybook.portalSections,
      toneOptions: typeof dbPlaybook.toneOptions === "string" ? JSON.parse(dbPlaybook.toneOptions) : dbPlaybook.toneOptions,
      objectionHandlers: typeof dbPlaybook.objectionHandlers === "string" ? JSON.parse(dbPlaybook.objectionHandlers) : dbPlaybook.objectionHandlers,
    } as PlaybookConfig;
  });

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
