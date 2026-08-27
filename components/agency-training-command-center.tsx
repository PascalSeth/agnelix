/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import {
  BrainCircuit,
  GraduationCap,
  ListChecks,
  Loader2,
  Power,
  Trash2,
  Plus,
  FileText,
  Clock,
  Bot,
  Zap,
  CheckCircle2,
  ArrowRight,
  Settings2,
  Flame,
  MessageSquare,
  Mail,
  FileSpreadsheet,
  Lightbulb,
  Edit3,
  X,
  Sparkles,
  Check,
  ChevronDown,
  ChevronUp,
  Sliders,
  ShieldAlert,
} from "lucide-react"
import { toast } from "sonner"
import { getWorkspace } from "@/lib/workspaces"

export type CompanyRule = {
  id: string
  surface: "ALL" | "EMAIL" | "REPLY" | "PROPOSAL" | "ADVISOR"
  title: string
  instruction: string
  goodExample: string | null
  badExample: string | null
  enabled: boolean
  priority: number
  source: string
  sourceRef: string | null
  createdAt?: string
}

export type AgentGoal = {
  meetingsPerMonth: number
  replyRateTarget: number
  dailyLeadCap: number
  autoSendEnabled: boolean
  autoProspectingEnabled: boolean
  reviewWindowMins: number
  maxAutoSendsPerDay: number
  minConfidence: "LOW" | "MEDIUM" | "HIGH"
  lowPriorityDelayMins: number
  highPriorityDelayMins: number
  autoSendOnlyWhenOffline?: boolean
  criticalDelayMins?: number
  questionDelayMins?: number
  objectionDelayMins?: number
  offlineDelayMins?: number
  personaConfig?: {
    proposalPriceRange?: string
    meetingAvailability?: string
    coreServices?: string
    additionalRules?: string
  } | null
  user?: {
    agencyName: string | null
    companyDesc: string | null
    title: string | null
    tone: string | null
    name: string | null
    fromEmail: string | null
    playbookType: string | null
    lastActiveAt?: string | null
  }
}

const SURFACES = [
  { value: "ALL", label: "Everywhere", icon: Zap },
  { value: "REPLY", label: "Inbox & Objections", icon: MessageSquare },
  { value: "EMAIL", label: "Cold Outreach", icon: Mail },
  { value: "PROPOSAL", label: "Proposals & Pricing", icon: FileSpreadsheet },
] as const

const QUICK_PROMPT_CHIPS = [
  "Never discount retainer fee; offer a free audit bonus instead",
  "Require 50% upfront deposit on custom projects before kickoff",
  "Disqualify leads under $20k/mo revenue and offer free guide",
  "Never send full pricing deck over email before a 15-min discovery call",
  "Banned buzzwords: synergy, cutting-edge, revolutionize, game-changer",
  "When prospect mentions competitor, reframe to our dedicated partner model",
]

const TIMING_PRESETS = [
  {
    name: "⚡ Instant / Aggressive",
    desc: "Captures warm leads immediately",
    values: { criticalDelayMins: 0, questionDelayMins: 2, objectionDelayMins: 5, offlineDelayMins: 1 },
  },
  {
    name: "⏱️ Natural Human Pacing (Recommended)",
    desc: "Feels like an attentive sales consultant",
    values: { criticalDelayMins: 1, questionDelayMins: 5, objectionDelayMins: 15, offlineDelayMins: 2 },
  },
  {
    name: "🛡️ Thoughtful / High-Ticket",
    desc: "Longer buffer times for strategic rebuttals",
    values: { criticalDelayMins: 3, questionDelayMins: 10, objectionDelayMins: 25, offlineDelayMins: 5 },
  },
]

const QUICK_TESTS = [
  { label: "Pricing Pushback", text: "“$4,000/mo is over our budget. Can you do it for $2,000 to start?”", surface: "REPLY" as const },
  { label: "Already Have Agency", text: "“We already have an agency handling this and we're happy with them.”", surface: "REPLY" as const },
  { label: "Send Info by Email", text: "“Don't have time for a call. Just email me your full pricing deck.”", surface: "REPLY" as const },
  { label: "Cold Outreach Hook", text: "Founder of a 20-person B2B firm struggling to book sales calls.", surface: "EMAIL" as const },
]

const fieldStyle = {
  background: "rgba(255,255,255,.03)",
  border: "1px solid rgba(255,255,255,.08)",
}

export function AgencyTrainingCommandCenter({
  playbookType,
  goal,
  onSaveGoal,
  savingGoal,
}: {
  playbookType?: string | null
  goal: AgentGoal | null
  onSaveGoal: (partial: Partial<AgentGoal>) => Promise<void>
  savingGoal: boolean
}) {
  const workspace = getWorkspace(playbookType)

  // 3-Tab Architecture
  const [activeTab, setActiveTab] = useState<"rules" | "test" | "autopilot">("rules")

  // Company Rules State
  const [rules, setRules] = useState<CompanyRule[]>([])
  const [loadingRules, setLoadingRules] = useState(true)
  const [surfaceFilter, setSurfaceFilter] = useState<string>("ALL")

  // AI Rule Synthesizer Bar (Zero-effort prompt input)
  const [aiPromptInput, setAiPromptInput] = useState("")
  const [isGeneratingRule, setIsGeneratingRule] = useState(false)

  // SOP & PDF Ingest Accordion
  const [showSopIngest, setShowSopIngest] = useState(false)
  const [ingestMode, setIngestMode] = useState<"pdf" | "text">("pdf")
  const [sopText, setSopText] = useState("")
  const [sopTitle, setSopTitle] = useState("")
  const [sopPdf, setSopPdf] = useState<{ name: string; base64: string; size: string } | null>(null)
  const [ingestingSop, setIngestingSop] = useState(false)

  // Viewport-Safe Modal
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [modalMode, setModalMode] = useState<"ai" | "manual">("ai")
  const [editingRule, setEditingRule] = useState<CompanyRule | null>(null)
  const [modalAiThought, setModalAiThought] = useState("")
  const [ruleForm, setRuleForm] = useState({
    surface: "ALL" as CompanyRule["surface"],
    title: "",
    instruction: "",
    goodExample: "",
    badExample: "",
    priority: 10,
  })
  const [savingRule, setSavingRule] = useState(false)

  // Live Test Lab State
  const [testScenario, setTestScenario] = useState(QUICK_TESTS[0].text)
  const [testSurface, setTestSurface] = useState<"EMAIL" | "REPLY" | "PROPOSAL" | "ADVISOR">("REPLY")
  const [testOutput, setTestOutput] = useState("")
  const [testPriorOutput, setTestPriorOutput] = useState("")
  const [simulating, setSimulating] = useState(false)
  const [correctionNote, setCorrectionNote] = useState("")
  const [teaching, setTeaching] = useState(false)

  function loadCompanyRules() {
    fetch("/api/agent/training")
      .then(r => (r.ok ? r.json() : []))
      .then(data => setRules(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingRules(false))
  }

  useEffect(() => {
    loadCompanyRules()
  }, [])

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    if (!sopTitle.trim()) setSopTitle(file.name.replace(/\.(pdf|txt|md|docx)$/i, ""))

    if (file.name.toLowerCase().endsWith(".pdf")) {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = String(reader.result).split(",")[1] ?? ""
        setSopPdf({ name: file.name, base64, size: `${sizeMb} MB` })
        setSopText("")
      }
      reader.readAsDataURL(file)
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        setSopText(String(reader.result))
        setSopPdf(null)
      }
      reader.readAsText(file)
    }
  }

  // 1-Click AI Rule Generator
  async function generateRuleFromThought(thoughtText: string) {
    if (!thoughtText.trim() || thoughtText.length < 5) {
      toast.error("Please type a rule or instruction in plain English")
      return
    }

    setIsGeneratingRule(true)
    try {
      const res = await fetch("/api/agent/training/generate-rule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: thoughtText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate rule")

      // Populate form and open modal for instant 1-click confirmation
      setRuleForm(data.rule)
      setEditingRule(null)
      setModalMode("ai")
      setModalAiThought(thoughtText)
      setShowRuleModal(true)
      setAiPromptInput("")
    } catch (err: any) {
      toast.error(err.message || "Failed to generate rule")
    } finally {
      setIsGeneratingRule(false)
    }
  }

  async function handleSaveRule() {
    if (!ruleForm.title.trim() || !ruleForm.instruction.trim()) {
      toast.error("Please provide a title and instruction.")
      return
    }

    setSavingRule(true)
    try {
      if (editingRule) {
        const res = await fetch(`/api/agent/training/${editingRule.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ruleForm),
        })
        if (!res.ok) throw new Error("Failed to update rule")
        const updated = await res.json()
        setRules(prev => prev.map(r => (r.id === editingRule.id ? updated : r)))
        toast.success("Company rule updated")
      } else {
        const res = await fetch("/api/agent/training", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ruleForm),
        })
        if (!res.ok) throw new Error("Failed to create rule")
        const created = await res.json()
        setRules(prev => [created, ...prev])
        toast.success("New company rule added (Top Priority)")
      }
      setShowRuleModal(false)
      setEditingRule(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to save rule")
    } finally {
      setSavingRule(false)
    }
  }

  async function toggleRule(rule: CompanyRule) {
    const nextState = !rule.enabled
    setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, enabled: nextState } : r)))
    try {
      const res = await fetch(`/api/agent/training/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState }),
      })
      if (!res.ok) throw new Error("Toggle failed")
      toast.success(nextState ? "Rule enabled" : "Rule paused")
    } catch {
      setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, enabled: rule.enabled } : r)))
      toast.error("Failed to toggle rule")
    }
  }

  async function deleteRule(id: string) {
    setRules(prev => prev.filter(r => r.id !== id))
    try {
      await fetch(`/api/agent/training/${id}`, { method: "DELETE" })
      toast.success("Rule removed")
    } catch {
      toast.error("Failed to delete rule")
      loadCompanyRules()
    }
  }

  async function handleIngestSop() {
    if (!sopPdf && (!sopText.trim() || sopText.length < 25)) {
      toast.error("Please attach a PDF file or paste your SOP notes.")
      return
    }

    setIngestingSop(true)
    try {
      const payload: any = {
        title: sopTitle || (sopPdf ? sopPdf.name : "Company Sales SOP"),
      }
      if (sopPdf) {
        payload.pdfBase64 = sopPdf.base64
      } else {
        payload.text = sopText
      }

      const res = await fetch("/api/agent/training/ingest-sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to process document")

      setRules(prev => [...data.rules, ...prev])
      toast.success(`Parsed & learned ${data.count} company rules from "${data.documentTitle}"!`)
      setSopText("")
      setSopPdf(null)
      setSopTitle("")
      setShowSopIngest(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to distill document")
    } finally {
      setIngestingSop(false)
    }
  }

  async function runTestSimulation(isRetry = false) {
    if (!testScenario.trim()) {
      toast.error("Please enter a scenario to test")
      return
    }

    setSimulating(true)
    if (isRetry) {
      setTestPriorOutput(testOutput)
    } else {
      setTestPriorOutput("")
    }

    try {
      const res = await fetch("/api/agent/training/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface: testSurface, scenario: testScenario }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Simulation failed")
      setTestOutput(data.response)
      setCorrectionNote("")
    } catch (err: any) {
      toast.error(err.message || "Simulation failed")
    } finally {
      setSimulating(false)
    }
  }

  async function handleTeachCorrection() {
    if (!correctionNote.trim()) {
      toast.error("Type how the AI should answer or what rule it should follow.")
      return
    }

    setTeaching(true)
    try {
      const res = await fetch("/api/agent/training/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface: testSurface,
          scenario: testScenario,
          aiResponse: testOutput,
          feedback: correctionNote,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to teach AI")

      setRules(prev => [data.rule, ...prev])
      toast.success("New rule learned — re-testing scenario!")
      setCorrectionNote("")
      runTestSimulation(true)
    } catch (err: any) {
      toast.error(err.message || "Failed to teach AI")
    } finally {
      setTeaching(false)
    }
  }

  const filteredRules = surfaceFilter === "ALL" ? rules : rules.filter(r => r.surface === surfaceFilter || r.surface === "ALL")
  const activeCount = rules.filter(r => r.enabled).length

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div
        className="rounded-2xl p-5 sm:p-6 border flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(168,85,247,0.03) 100%)",
          borderColor: "rgba(99,102,241,0.16)",
        }}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              {goal?.user?.agencyName || "Company"} Knowledge Space
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10 font-semibold">
              {workspace.name}
            </span>
          </div>
          <h2 className="text-[20px] font-black text-white/90">AI Sales Engine & Training</h2>
          <p className="text-[12.5px] text-white/50 max-w-2xl leading-relaxed">
            Your custom company rules <strong className="text-emerald-400 font-semibold">take top priority</strong> and override default templates in your inbox, sequences, and proposals.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              setEditingRule(null)
              setModalMode("ai")
              setModalAiThought("")
              setRuleForm({
                surface: "ALL",
                title: "",
                instruction: "",
                goodExample: "",
                badExample: "",
                priority: 10,
              })
              setShowRuleModal(true)
            }}
            className="flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[12.5px] font-bold text-black shadow hover:bg-white/90 transition-all active:scale-95"
          >
            <Sparkles className="size-4 text-violet-600" />
            Teach New Rule
          </button>
        </div>
      </div>

      {/* 3-Tab Segmented Switcher */}
      <div className="flex p-1 rounded-xl bg-black/40 border border-white/10 max-w-lg">
        <button
          onClick={() => setActiveTab("rules")}
          className={`flex-1 py-2 px-3 rounded-lg text-[12.5px] font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "rules"
              ? "bg-white/15 text-white shadow-sm"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <ListChecks className="size-3.5 text-violet-400" />
          Company Rules ({activeCount})
        </button>

        <button
          onClick={() => setActiveTab("test")}
          className={`flex-1 py-2 px-3 rounded-lg text-[12.5px] font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "test"
              ? "bg-white/15 text-white shadow-sm"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <GraduationCap className="size-3.5 text-amber-400" />
          Test & Teach
        </button>

        <button
          onClick={() => setActiveTab("autopilot")}
          className={`flex-1 py-2 px-3 rounded-lg text-[12.5px] font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === "autopilot"
              ? "bg-white/15 text-white shadow-sm"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <Clock className="size-3.5 text-sky-400" />
          Timing & Autopilot
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: COMPANY RULES (WITH INSTANT AI SYNTHESIZER BAR)             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "rules" && (
        <div className="space-y-5">
          {/* AI Conversational Rule Creator Bar */}
          <div
            className="p-4 sm:p-5 rounded-2xl border space-y-3.5"
            style={{
              background: "linear-gradient(135deg, rgba(168,85,247,0.06) 0%, rgba(99,102,241,0.02) 100%)",
              borderColor: "rgba(168,85,247,0.2)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-violet-400" />
                <span className="text-[12.5px] font-extrabold text-white/90">
                  Teach AI in Plain English (Zero Manual Form Filling)
                </span>
              </div>
              <span className="text-[11px] text-violet-300/80 font-medium">AI auto-synthesizes rules & examples</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={aiPromptInput}
                onChange={e => setAiPromptInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    generateRuleFromThought(aiPromptInput)
                  }
                }}
                placeholder="e.g. Never discount on the first call, always offer a free strategy sprint instead..."
                className="flex-1 rounded-xl px-4 py-2.5 text-[13px] text-white/90 outline-none placeholder:text-white/30 border border-white/10 bg-black/40 focus:border-violet-500 transition-colors"
              />
              <button
                onClick={() => generateRuleFromThought(aiPromptInput)}
                disabled={isGeneratingRule || aiPromptInput.trim().length < 5}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[12.5px] transition-all disabled:opacity-40 whitespace-nowrap shadow-lg shadow-violet-600/20"
              >
                {isGeneratingRule ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Generate Rule
              </button>
            </div>

            {/* Quick Prompt Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/40 block">
                Click a common rule to customize with AI:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {QUICK_PROMPT_CHIPS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setAiPromptInput(chip)
                      generateRuleFromThought(chip)
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11.5px] text-white/70 hover:text-white whitespace-nowrap transition-all flex items-center gap-1.5"
                  >
                    <Plus className="size-3 text-violet-400" />
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Collapsible SOP Documents & PDF Ingest Box */}
          <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.015] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-white/70 flex items-center gap-1.5">
                <FileText className="size-4 text-emerald-400" />
                Upload PDF Sales Handbook or Paste SOP Notes
              </span>
              <button
                onClick={() => setShowSopIngest(!showSopIngest)}
                className="text-[11.5px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                {showSopIngest ? "Hide Ingestion Box" : "Attach PDF / Paste Notes"}
                {showSopIngest ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            </div>

            {showSopIngest && (
              <div className="pt-3 border-t border-white/10 space-y-4">
                {/* Mode Selector */}
                <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/10 max-w-xs">
                  <button
                    onClick={() => setIngestMode("pdf")}
                    className={`flex-1 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                      ingestMode === "pdf" ? "bg-emerald-600 text-white shadow-sm" : "text-white/40 hover:text-white"
                    }`}
                  >
                    <FileText className="size-3" /> Upload PDF Document
                  </button>
                  <button
                    onClick={() => setIngestMode("text")}
                    className={`flex-1 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                      ingestMode === "text" ? "bg-emerald-600 text-white shadow-sm" : "text-white/40 hover:text-white"
                    }`}
                  >
                    <Edit3 className="size-3" /> Paste Text
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="space-y-1 block">
                    <span className="text-[10.5px] font-bold text-white/40 uppercase">
                      Document Title (e.g. Q3 Sales Playbook, Retainer Terms SOP)
                    </span>
                    <input
                      value={sopTitle}
                      onChange={e => setSopTitle(e.target.value)}
                      placeholder="e.g. Acme Sales Handbook"
                      className="w-full rounded-xl px-3 py-2 text-[12px] text-white/90 outline-none"
                      style={fieldStyle}
                    />
                  </label>

                  {ingestMode === "pdf" ? (
                    <div className="space-y-2">
                      <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-white/15 hover:border-emerald-500/50 rounded-2xl bg-white/[0.01] hover:bg-emerald-500/[0.02] cursor-pointer transition-all">
                        <input
                          type="file"
                          accept=".pdf,.txt,.md,.docx"
                          onChange={handleFileSelected}
                          className="hidden"
                        />
                        <FileText className="size-8 text-emerald-400/80 mb-2" />
                        <span className="text-[13px] font-bold text-white/90">
                          {sopPdf ? sopPdf.name : "Click to attach or drag & drop a PDF document"}
                        </span>
                        <span className="text-[11px] text-white/40 mt-0.5">
                          {sopPdf ? `Size: ${sopPdf.size} • Ready for AI extraction` : "PDF, TXT, or MD sales handbooks (up to 50MB)"}
                        </span>
                      </label>
                      {sopPdf && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[12px] text-emerald-300">
                          <span className="font-semibold truncate max-w-sm">✓ Attached: {sopPdf.name} ({sopPdf.size})</span>
                          <button
                            onClick={() => setSopPdf(null)}
                            className="text-[11px] font-bold text-rose-400 hover:text-rose-300 ml-2"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={sopText}
                      onChange={e => setSopText(e.target.value)}
                      rows={4}
                      placeholder="Paste your procedure notes, employee sales guidelines, or pricing rules here..."
                      className="w-full rounded-xl p-3 text-[12.5px] text-white/90 outline-none resize-none"
                      style={fieldStyle}
                    />
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={handleIngestSop}
                    disabled={ingestingSop || (!sopPdf && sopText.trim().length < 25)}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[12.5px] transition-all disabled:opacity-40 shadow-lg shadow-emerald-500/20"
                  >
                    {ingestingSop ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {ingestingSop ? "Parsing PDF & Extracting Rules..." : "Extract & Learn Company Rules"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Surface Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSurfaceFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all ${
                surfaceFilter === "ALL" ? "bg-violet-600 text-white" : "bg-white/5 text-white/50 hover:text-white/80"
              }`}
            >
              All Rules ({rules.length})
            </button>
            {SURFACES.map(s => {
              const count = rules.filter(r => r.surface === s.value).length
              return (
                <button
                  key={s.value}
                  onClick={() => setSurfaceFilter(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-[11.5px] font-bold transition-all flex items-center gap-1.5 ${
                    surfaceFilter === s.value
                      ? "bg-violet-600 text-white"
                      : "bg-white/5 text-white/50 hover:text-white/80"
                  }`}
                >
                  <s.icon className="size-3" />
                  {s.label.split(" ")[0]} ({count})
                </button>
              )
            })}
          </div>

          {/* Active Rules List */}
          {loadingRules ? (
            <div className="flex items-center justify-center py-12 text-white/30">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-10 rounded-2xl border border-dashed border-white/10 bg-white/[0.01] space-y-2">
              <p className="text-[13px] font-bold text-white/70">No company rules active</p>
              <p className="text-[11.5px] text-white/40 max-w-sm mx-auto">
                Type an instruction in the prompt bar above to create your first company rule.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRules.map((rule, idx) => (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-all ${
                    rule.enabled
                      ? "bg-white/[0.025] border-white/[0.07] hover:border-white/15"
                      : "bg-white/[0.01] border-white/[0.03] opacity-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black text-violet-400">#{idx + 1}</span>
                        <span className="text-[13px] font-bold text-white/90">{rule.title}</span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 text-white/60 border border-white/10">
                          {rule.surface}
                        </span>
                        <span className="text-[8.5px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Top Priority Override
                        </span>
                      </div>

                      <p className="text-[12px] text-white/70 leading-relaxed">{rule.instruction}</p>

                      {rule.goodExample && (
                        <p className="text-[11.5px] text-emerald-300/80 bg-emerald-500/[0.04] p-2 rounded-lg border border-emerald-500/10">
                          <span className="font-bold text-emerald-400 mr-1">✓ Example:</span>
                          {rule.goodExample}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      <button
                        onClick={() => {
                          setEditingRule(rule)
                          setModalMode("manual")
                          setRuleForm({
                            surface: rule.surface,
                            title: rule.title,
                            instruction: rule.instruction,
                            goodExample: rule.goodExample || "",
                            badExample: rule.badExample || "",
                            priority: rule.priority || 10,
                          })
                          setShowRuleModal(true)
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        title="Edit Rule"
                      >
                        <Edit3 className="size-3.5" />
                      </button>

                      <button
                        onClick={() => toggleRule(rule)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          rule.enabled
                            ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-white/5 text-white/30 hover:bg-white/10"
                        }`}
                        title={rule.enabled ? "Pause Rule" : "Activate Rule"}
                      >
                        <Power className="size-3.5" />
                      </button>

                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/30 hover:text-rose-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: TEST & TEACH                                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "test" && (
        <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.015] space-y-5">
          <div className="space-y-1">
            <h3 className="text-[15px] font-black text-white/90 flex items-center gap-2">
              <GraduationCap className="size-4 text-amber-400" />
              Live AI Alignment Tester
            </h3>
            <p className="text-[12px] text-white/40">
              Pick a quick scenario or type a prospect reply to verify how the AI applies your company rules.
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {QUICK_TESTS.map((t, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setTestSurface(t.surface)
                  setTestScenario(t.text)
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11.5px] font-semibold text-white/70 hover:text-white whitespace-nowrap transition-all"
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <textarea
              value={testScenario}
              onChange={e => setTestScenario(e.target.value)}
              rows={2}
              className="w-full rounded-xl p-3 text-[12.5px] text-white/90 outline-none resize-none leading-relaxed"
              style={fieldStyle}
              placeholder="Type a prospect reply or question..."
            />

            <button
              onClick={() => runTestSimulation(false)}
              disabled={simulating}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-black font-extrabold text-[12.5px] hover:bg-white/90 transition-all disabled:opacity-50"
            >
              {simulating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Generate AI Output
            </button>
          </div>

          {/* Output & 1-Click Teaching Box */}
          {testOutput && (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="size-3.5" /> Generated Response
                </span>
                {testPriorOutput && (
                  <span className="text-[10px] text-white/40">Updated after rule correction</span>
                )}
              </div>

              <div className="p-3.5 rounded-lg bg-black/40 text-[12.5px] text-white/90 whitespace-pre-wrap leading-relaxed border border-white/5">
                {testOutput}
              </div>

              {/* Correction input */}
              <div className="pt-2 space-y-2">
                <label className="block text-[11px] font-bold text-violet-300 uppercase tracking-wider">
                  Not quite right? Teach the AI what to change:
                </label>
                <div className="flex gap-2">
                  <input
                    value={correctionNote}
                    onChange={e => setCorrectionNote(e.target.value)}
                    placeholder="e.g. Never mention discounts. Pivot to our 15-min discovery call."
                    className="flex-1 rounded-xl px-3 py-2 text-[12px] text-white/90 outline-none"
                    style={fieldStyle}
                  />
                  <button
                    onClick={handleTeachCorrection}
                    disabled={teaching || !correctionNote.trim()}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[12px] transition-all disabled:opacity-40 whitespace-nowrap flex items-center gap-1.5"
                  >
                    {teaching ? <Loader2 className="size-3.5 animate-spin" /> : <Flame className="size-3.5" />}
                    Save Rule & Re-test
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: TIMING & AUTOPILOT                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeTab === "autopilot" && goal && (
        <div className="space-y-6">
          {/* Autopilot Dispatch & Mode */}
          <div
            className="p-5 rounded-2xl border space-y-4"
            style={{ background: "rgba(99,102,241,.04)", borderColor: "rgba(99,102,241,.15)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-extrabold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Bot className="size-4" /> Autopilot Dispatch Mode
                </p>
                <p className="text-[11.5px] text-white/40 mt-0.5">Control automated AI reply dispatching.</p>
              </div>
              {savingGoal && <Loader2 className="size-4 animate-spin text-white/30" />}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div>
                  <p className="text-[13px] font-bold text-white/90">Enable AI Auto-Pilot</p>
                  <p className="text-[11px] text-white/40 mt-0.5">Allows agent to send approved drafts automatically.</p>
                </div>
                <button
                  onClick={() => onSaveGoal({ autoSendEnabled: !goal.autoSendEnabled })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    goal.autoSendEnabled ? "bg-violet-600" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block size-5 transform rounded-full bg-white shadow transition ${
                      goal.autoSendEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-bold text-white/90">Auto-Send When Offline Only</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-white/40 mt-0.5">24/7 replies while away; manual review while in app.</p>
                </div>
                <button
                  onClick={() => onSaveGoal({ autoSendOnlyWhenOffline: !goal.autoSendOnlyWhenOffline })}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    goal.autoSendOnlyWhenOffline ? "bg-emerald-600" : "bg-white/10"
                  }`}
                >
                  <span
                    className={`inline-block size-5 transform rounded-full bg-white shadow transition ${
                      goal.autoSendOnlyWhenOffline ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <label className="space-y-1">
                <span className="text-[11px] text-white/40">Monthly Meeting Target</span>
                <input
                  type="number"
                  min={1}
                  value={goal.meetingsPerMonth}
                  onChange={e => onSaveGoal({ meetingsPerMonth: Number(e.target.value) })}
                  className="w-full rounded-xl px-3 py-2 text-[12.5px] text-white/85 outline-none"
                  style={fieldStyle}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-white/40">Target Reply Rate %</span>
                <input
                  type="number"
                  min={1}
                  value={goal.replyRateTarget}
                  onChange={e => onSaveGoal({ replyRateTarget: Number(e.target.value) })}
                  className="w-full rounded-xl px-3 py-2 text-[12.5px] text-white/85 outline-none"
                  style={fieldStyle}
                />
              </label>
              <label className="space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-white/40">Daily Lead Send Cap</span>
                <input
                  type="number"
                  min={5}
                  value={goal.dailyLeadCap}
                  onChange={e => onSaveGoal({ dailyLeadCap: Number(e.target.value) })}
                  className="w-full rounded-xl px-3 py-2 text-[12.5px] text-white/85 outline-none"
                  style={fieldStyle}
                />
              </label>
            </div>
          </div>

          {/* AI Response Timing Matrix (Restored & Enhanced) */}
          <div
            className="p-5 rounded-2xl border space-y-4"
            style={{ background: "rgba(16,185,129,.04)", borderColor: "rgba(16,185,129,.15)" }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-[12px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="size-4" /> Criticality Response Timing Matrix
                </p>
                <p className="text-[11.5px] text-white/40 mt-0.5">
                  Controls how fast the AI dispatches replies based on message urgency and intent.
                </p>
              </div>

              {/* Quick Timing Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-white/40 uppercase mr-1">Presets:</span>
                {TIMING_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSaveGoal(p.values)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-white/70 hover:text-white transition-all"
                  >
                    {p.name.split(" ")[0]} {p.name.split(" ")[1]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* Hot Leads */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-300">⚡ Hot Leads / Demo</span>
                  <span className="text-[10px] text-white/30">Urgent</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={goal.criticalDelayMins ?? 1}
                    onChange={e => onSaveGoal({ criticalDelayMins: Number(e.target.value) })}
                    className="w-20 rounded-lg px-2.5 py-1.5 text-[13px] font-bold text-white outline-none"
                    style={fieldStyle}
                  />
                  <span className="text-[11px] text-white/50">min delay</span>
                </div>
                <span className="text-[10px] text-white/40 block">
                  {(goal.criticalDelayMins ?? 1) === 0 ? "⚡ Instant auto-send" : `Replies within ${goal.criticalDelayMins ?? 1}m`}
                </span>
              </div>

              {/* Inquiries */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sky-300">💬 Questions & Pricing</span>
                  <span className="text-[10px] text-white/30">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={goal.questionDelayMins ?? 5}
                    onChange={e => onSaveGoal({ questionDelayMins: Number(e.target.value) })}
                    className="w-20 rounded-lg px-2.5 py-1.5 text-[13px] font-bold text-white outline-none"
                    style={fieldStyle}
                  />
                  <span className="text-[11px] text-white/50">min delay</span>
                </div>
                <span className="text-[10px] text-white/40 block">
                  Buffer (~{goal.questionDelayMins ?? 5}m) with lead context
                </span>
              </div>

              {/* Objections */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300">🛡️ Pushback / Objection</span>
                  <span className="text-[10px] text-white/30">Thoughtful</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={180}
                    value={goal.objectionDelayMins ?? 15}
                    onChange={e => onSaveGoal({ objectionDelayMins: Number(e.target.value) })}
                    className="w-20 rounded-lg px-2.5 py-1.5 text-[13px] font-bold text-white outline-none"
                    style={fieldStyle}
                  />
                  <span className="text-[11px] text-white/50">min delay</span>
                </div>
                <span className="text-[10px] text-white/40 block">
                  Buffer (~{goal.objectionDelayMins ?? 15}m) for consultative rebuttal
                </span>
              </div>

              {/* Offline Speed */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300">🌙 Offline / Away</span>
                  <span className="text-[10px] text-white/30">24/7 Autopilot</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={goal.offlineDelayMins ?? 2}
                    onChange={e => onSaveGoal({ offlineDelayMins: Number(e.target.value) })}
                    className="w-20 rounded-lg px-2.5 py-1.5 text-[13px] font-bold text-white outline-none"
                    style={fieldStyle}
                  />
                  <span className="text-[11px] text-white/50">min delay</span>
                </div>
                <span className="text-[10px] text-white/40 block">
                  Auto-dispatches in ~{goal.offlineDelayMins ?? 2}m while away
                </span>
              </div>
            </div>
          </div>

          {/* Pricing & Offer Anchors */}
          <div
            className="p-5 rounded-2xl border space-y-3.5"
            style={{ background: "rgba(168,85,247,.04)", borderColor: "rgba(168,85,247,.15)" }}
          >
            <div>
              <p className="text-[12px] font-extrabold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="size-4" /> Pricing & Offer Anchors
              </p>
              <p className="text-[11.5px] text-white/40 mt-0.5">Used by AI when quoting proposals and answering pricing questions.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="space-y-1 block">
                <span className="text-[10.5px] text-white/40">Retainer / Project Price Range</span>
                <input
                  value={goal.personaConfig?.proposalPriceRange || ""}
                  onChange={e =>
                    onSaveGoal({
                      personaConfig: { ...(goal.personaConfig || {}), proposalPriceRange: e.target.value },
                    })
                  }
                  placeholder="e.g. $3,000 - $6,000 / month"
                  className="w-full rounded-xl px-3 py-2 text-[12.5px] text-white/85 outline-none"
                  style={fieldStyle}
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[10.5px] text-white/40">Meeting Availability</span>
                <input
                  value={goal.personaConfig?.meetingAvailability || ""}
                  onChange={e =>
                    onSaveGoal({
                      personaConfig: { ...(goal.personaConfig || {}), meetingAvailability: e.target.value },
                    })
                  }
                  placeholder="e.g. Tuesdays & Thursdays 10am-3pm EST"
                  className="w-full rounded-xl px-3 py-2 text-[12.5px] text-white/85 outline-none"
                  style={fieldStyle}
                />
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-[10.5px] text-white/40">Core Services</span>
              <input
                value={goal.personaConfig?.coreServices || ""}
                onChange={e =>
                  onSaveGoal({
                    personaConfig: { ...(goal.personaConfig || {}), coreServices: e.target.value },
                  })
                }
                placeholder="e.g. Outbound Infrastructure, Lead Generation, CRO"
                className="w-full rounded-xl px-3 py-2 text-[12.5px] text-white/85 outline-none"
                style={fieldStyle}
              />
            </label>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* VIEWPORT-SAFE MODAL WITH AI ASSIST & MANUAL TABS                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-white/15 bg-[#13141c] shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-white/10 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="size-4 text-violet-400" />
                <h3 className="text-[14.5px] font-black text-white/95">
                  {editingRule ? "Edit Company Rule" : "Teach Company AI Rule"}
                </h3>
              </div>
              <button
                onClick={() => setShowRuleModal(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="px-5 py-4 space-y-3.5 overflow-y-auto flex-1">
              {/* Mode Toggle */}
              {!editingRule && (
                <div className="flex p-1 rounded-xl bg-white/[0.04] border border-white/10 mb-2">
                  <button
                    onClick={() => setModalMode("ai")}
                    className={`flex-1 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                      modalMode === "ai" ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"
                    }`}
                  >
                    <Sparkles className="size-3" /> AI Assistant (Fast)
                  </button>
                  <button
                    onClick={() => setModalMode("manual")}
                    className={`flex-1 py-1.5 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                      modalMode === "manual" ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"
                    }`}
                  >
                    <Edit3 className="size-3" /> Manual Input
                  </button>
                </div>
              )}

              {modalMode === "ai" && !editingRule && (
                <div className="space-y-3 p-3.5 rounded-xl bg-violet-500/[0.04] border border-violet-500/20">
                  <label className="space-y-1 block">
                    <span className="text-[10.5px] font-bold text-violet-300 uppercase">
                      Describe your rule in plain English:
                    </span>
                    <div className="flex gap-2">
                      <input
                        value={modalAiThought}
                        onChange={e => setModalAiThought(e.target.value)}
                        placeholder="e.g. Always state that we require 50% deposit before kickoff"
                        className="flex-1 rounded-xl px-3 py-2 text-[12px] text-white/90 outline-none"
                        style={fieldStyle}
                      />
                      <button
                        onClick={async () => {
                          if (!modalAiThought.trim()) return
                          setIsGeneratingRule(true)
                          try {
                            const res = await fetch("/api/agent/training/generate-rule", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ prompt: modalAiThought }),
                            })
                            const data = await res.json()
                            if (data.rule) {
                              setRuleForm(data.rule)
                              toast.success("Rule synthesized!")
                            }
                          } finally {
                            setIsGeneratingRule(false)
                          }
                        }}
                        disabled={isGeneratingRule || !modalAiThought.trim()}
                        className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[11.5px] whitespace-nowrap disabled:opacity-40"
                      >
                        {isGeneratingRule ? <Loader2 className="size-3.5 animate-spin" /> : "Synthesize"}
                      </button>
                    </div>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 block">
                  <span className="text-[10.5px] font-bold text-white/40 uppercase">Applies To</span>
                  <select
                    value={ruleForm.surface}
                    onChange={e => setRuleForm({ ...ruleForm, surface: e.target.value as any })}
                    className="w-full rounded-xl px-3 py-2 text-[12px] font-bold text-white/90 bg-white/[0.04] border border-white/10 outline-none"
                  >
                    {SURFACES.map(s => (
                      <option key={s.value} value={s.value} className="bg-[#13141c]">
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 block">
                  <span className="text-[10.5px] font-bold text-white/40 uppercase">Priority</span>
                  <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400 text-center truncate">
                    ★ Top Priority (Overrides)
                  </div>
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-[10.5px] font-bold text-white/40 uppercase">Rule Title</span>
                <input
                  value={ruleForm.title}
                  onChange={e => setRuleForm({ ...ruleForm, title: e.target.value })}
                  placeholder="e.g. Strict No-Discount Policy"
                  className="w-full rounded-xl px-3 py-2 text-[12.5px] text-white/90 outline-none"
                  style={fieldStyle}
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[10.5px] font-bold text-white/40 uppercase">
                  Instruction / Directive
                </span>
                <textarea
                  value={ruleForm.instruction}
                  onChange={e => setRuleForm({ ...ruleForm, instruction: e.target.value })}
                  rows={3}
                  placeholder="Describe what the AI must do on behalf of your company..."
                  className="w-full rounded-xl px-3 py-2 text-[12.5px] text-white/90 outline-none resize-none leading-relaxed"
                  style={fieldStyle}
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-[10.5px] font-bold text-emerald-400/80 uppercase">
                  ✓ Example (Optional)
                </span>
                <textarea
                  value={ruleForm.goodExample}
                  onChange={e => setRuleForm({ ...ruleForm, goodExample: e.target.value })}
                  rows={2}
                  placeholder="Concrete snippet showing this rule executed..."
                  className="w-full rounded-xl px-3 py-2 text-[12px] text-white/80 outline-none resize-none"
                  style={fieldStyle}
                />
              </label>
            </div>

            {/* Fixed Footer */}
            <div className="px-5 py-3 border-t border-white/10 shrink-0 flex items-center justify-end gap-2.5 bg-white/[0.01]">
              <button
                onClick={() => setShowRuleModal(false)}
                className="px-3.5 py-1.5 rounded-xl text-[12px] font-semibold text-white/50 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRule}
                disabled={savingRule}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-[12px] transition-all disabled:opacity-50 shadow"
              >
                {savingRule ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                {editingRule ? "Update Rule" : "Save to Playbook"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
