"use client"

import { useEffect, useRef, useState } from "react"
import {
  BrainCircuit as BrainIcon,
  Plus as PlusIcon,
  Trash2 as TrashIcon,
  Loader2 as LoaderIcon,
  Power as PowerIcon,
  GraduationCap as GradIcon,
  BookOpen as BookIcon,
  ListChecks as ListIcon,
  RefreshCw as RefreshIcon,
  FileUp as FileUpIcon,
  Swords as SwordsIcon,
  Play as PlayIcon,
  Square as SquareIcon,
  CalendarCheck as CalCheckIcon,
  XCircle as XCircleIcon,
  CheckCircle2 as CheckIcon,
  Copy as CopyIcon,
  Check as SingleCheckIcon,
  Zap as ZapIcon,
  Search as SearchIcon,
  Activity as ActivityIcon,
  Cpu as CpuIcon,
  Download as DownloadIcon,
  FileText as FileTextIcon,
  Layers as LayersIcon,
  ShieldCheck as ShieldIcon,
  ArrowRight,
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
} from "lucide-react"
import { Sparkles as SparklesIcon } from "@/components/ui/chat-bubble-icon"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type Rule = {
  id: string
  scope: string
  surface: "ALL" | "EMAIL" | "REPLY" | "PROPOSAL" | "ADVISOR"
  title: string
  instruction: string
  goodExample: string | null
  badExample: string | null
  enabled: boolean
  priority: number
  source: string
  sourceRef: string | null
}

type TrainingDoc = {
  id: string
  title: string
  scope: string
  surface: string
  lessonsCount: number
  createdAt: string
}

type ConversationItem = {
  id: string
  type: string
  intent: string
  status: string
  confidence: string
  draftSubject: string | null
  draftBody: string
  createdAt: string
  agency: { id: string; name: string; email: string; playbookType: string | null }
  lead: { id: string; name: string; company: string; industry: string; status: string }
  prospectReply: string | null
}

const PLAYBOOK_LENSES = [
  { id: "all", label: "All Workspaces", icon: "🌐" },
  { id: "sales", label: "Sales OS", icon: "⚡" },
  { id: "seo", label: "SEO OS", icon: "📈" },
  { id: "social_media", label: "Social OS", icon: "📱" },
  { id: "ppc", label: "PPC OS", icon: "🚀" },
  { id: "web_design", label: "Web Studio", icon: "🎨" },
  { id: "finance", label: "Finance OS", icon: "💼" },
]

const SCOPES = [
  { value: "global", label: "Global (All Workspaces)" },
  { value: "sales", label: "Sales OS" },
  { value: "seo", label: "SEO OS" },
  { value: "social_media", label: "Social OS" },
  { value: "ppc", label: "PPC OS" },
  { value: "web_design", label: "Web Studio" },
  { value: "finance", label: "Finance OS" },
]

const SURFACES = [
  { value: "REPLY", label: "Reply Drafts" },
  { value: "EMAIL", label: "Cold Outreach Emails" },
  { value: "PROPOSAL", label: "Proposals & Pitch Decks" },
  { value: "ADVISOR", label: "AI Copilot & Advisor" },
]
const SURFACES_ALL = [{ value: "ALL", label: "All Surfaces (Universal)" }, ...SURFACES]

const ATTITUDES = [
  { value: "skeptical", label: "Skeptical & Guarded (Burned in Past)", color: "#f43f5e" },
  { value: "busy", label: "Busy Executive (1-line curt brush-off)", color: "#fbbf24" },
  { value: "in_house", label: "Defending In-House Team / DIY", color: "#38bdf8" },
  { value: "price_sensitive", label: "Rate-Card & Budget Probing", color: "#a855f7" },
  { value: "hostile", label: "Cold Outreach Backlash", color: "#ef4444" },
]

export function AdminTrainingStudio() {
  const [activeLens, setActiveLens] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"ingest" | "rules" | "sandbox" | "spar" | "radar" | "export">("ingest")
  const [rules, setRules] = useState<Rule[]>([])
  const [documents, setDocuments] = useState<TrainingDoc[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loadingRules, setLoadingRules] = useState(true)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddRuleModal, setShowAddRuleModal] = useState(false)

  // ── Document Ingest & Page-by-Page Streaming State ──
  const [docTitle, setDocTitle] = useState("")
  const [docText, setDocText] = useState("")
  const [docScope, setDocScope] = useState("global")
  const [docSurface, setDocSurface] = useState("ALL")
  const [docPdf, setDocPdf] = useState<{ name: string; base64: string } | null>(null)
  const [ingesting, setIngesting] = useState(false)
  const [recentDistilled, setRecentDistilled] = useState<{
    title: string
    instruction: string
    goodExample?: string | null
    badExample?: string | null
    sourcePage?: string
    surface?: string
  }[]>([])
  const [deckSurfaceFilter, setDeckSurfaceFilter] = useState<string>("ALL")
  const [ingestState, setIngestState] = useState<{
    isStreaming: boolean
    status: string
    currentStep: number
    totalSteps: number
    startPage: number
    endPage: number
    totalPages: number
    title: string
    excerpt: string
    percent: number
    thinkingMsg: string
    lessonsLearned: Array<{
      title: string
      instruction: string
      goodExample?: string | null
      badExample?: string | null
      sourcePage?: string
    }>
    completed: boolean
  }>({
    isStreaming: false,
    status: "",
    currentStep: 0,
    totalSteps: 1,
    startPage: 0,
    endPage: 0,
    totalPages: 0,
    title: "",
    excerpt: "",
    percent: 0,
    thinkingMsg: "",
    lessonsLearned: [],
    completed: false,
  })
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Manual Rule Creation State ──
  const [newRule, setNewRule] = useState({
    title: "",
    instruction: "",
    goodExample: "",
    badExample: "",
    scope: "global",
    surface: "ALL",
  })
  const [savingRule, setSavingRule] = useState(false)

  // ── Sandbox / Teach State ──
  const [sandboxSurface, setSandboxSurface] = useState("REPLY")
  const [sandboxScope, setSandboxScope] = useState("global")
  const [sandboxScenario, setSandboxScenario] = useState("")
  const [aiResponse, setAiResponse] = useState("")
  const [priorResponse, setPriorResponse] = useState("")
  const [correction, setCorrection] = useState("")
  const [feedback, setFeedback] = useState("")
  const [lastLesson, setLastLesson] = useState<{ title: string; instruction: string } | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [teaching, setTeaching] = useState(false)

  // ── Sparring State ──
  const [sparScope, setSparScope] = useState("global")
  const [sparAttitude, setSparAttitude] = useState("skeptical")
  const [sparProspect, setSparProspect] = useState("")
  const [sparRounds, setSparRounds] = useState(3)
  const [sparConvo, setSparConvo] = useState<{ role: "agency" | "prospect"; text: string }[]>([])
  const [sparOutcome, setSparOutcome] = useState<"continue" | "booked" | "lost" | null>(null)
  const [sparRunning, setSparRunning] = useState(false)
  const sparStopRef = useRef(false)

  // Fetch initial rules
  useEffect(() => {
    fetchRules()
    fetchDocs()
  }, [])

  function fetchRules() {
    setLoadingRules(true)
    fetch("/api/admin/training")
      .then(r => (r.ok ? r.json() : []))
      .then(data => setRules(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingRules(false))
  }

  function fetchDocs() {
    setLoadingDocs(true)
    fetch("/api/admin/training/documents")
      .then(r => (r.ok ? r.json() : { documents: [] }))
      .then(data => setDocuments(data.documents || []))
      .catch(() => {})
      .finally(() => setLoadingDocs(false))
  }

  // Load live conversations when switching to Radar
  useEffect(() => {
    if (activeTab === "radar") {
      setLoadingConversations(true)
      fetch("/api/admin/conversations?limit=40")
        .then(r => (r.ok ? r.json() : { items: [] }))
        .then(data => setConversations(data.items || []))
        .catch(() => {})
        .finally(() => setLoadingConversations(false))
    }
  }, [activeTab])

  // Handle PDF / File upload
  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!docTitle.trim()) setDocTitle(file.name.replace(/\.(pdf|txt|md|epub)$/i, ""))
    if (file.name.toLowerCase().endsWith(".pdf")) {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = String(reader.result).split(",")[1] ?? ""
        setDocPdf({ name: file.name, base64 })
        setDocText("")
      }
      reader.readAsDataURL(file)
    } else {
      const reader = new FileReader()
      reader.onload = () => {
        setDocText(String(reader.result))
        setDocPdf(null)
      }
      reader.readAsText(file)
    }
  }

  // Ingest Document & Distill Page-by-Page with Real-Time Excerpts and Memory Persistence
  async function ingestDocument() {
    if (!docTitle.trim()) {
      toast.error("Please provide a name/title for this material")
      return
    }
    if (!docText.trim() && !docPdf) {
      toast.error("Please paste text or attach a PDF/TXT file")
      return
    }
    setIngesting(true)
    setRecentDistilled([])
    setIngestState({
      isStreaming: true,
      status: "Scanning PDF document and structuring page layout...",
      currentStep: 0,
      totalSteps: 1,
      startPage: 0,
      endPage: 0,
      totalPages: 0,
      title: "",
      excerpt: "",
      percent: 0,
      thinkingMsg: "Analyzing document...",
      lessonsLearned: [],
      completed: false,
    })

    try {
      const res = await fetch("/api/admin/training/ingest/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: docTitle,
          text: docText || undefined,
          pdfBase64: docPdf?.base64,
          scope: docScope,
          surface: docSurface,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || "Failed to start learning stream")
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response stream available")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split("\n\n")
        buffer = events.pop() || ""

        for (const rawEvent of events) {
          if (!rawEvent.trim()) continue
          const lines = rawEvent.split("\n")
          let eventName = "message"
          let dataStr = ""

          for (const line of lines) {
            if (line.startsWith("event: ")) eventName = line.slice(7).trim()
            else if (line.startsWith("data: ")) dataStr = line.slice(6).trim()
          }

          if (!dataStr) continue
          try {
            const data = JSON.parse(dataStr)

            if (eventName === "status") {
              setIngestState(s => ({ ...s, status: data.message }))
            } else if (eventName === "doc_init") {
              setIngestState(s => ({
                ...s,
                totalPages: data.totalPages,
                totalSteps: data.totalSteps,
                status: data.message,
              }))
            } else if (eventName === "step_start") {
              setIngestState(s => ({
                ...s,
                currentStep: data.stepIndex,
                totalSteps: data.totalSteps,
                startPage: data.startPage,
                endPage: data.endPage,
                totalPages: data.totalPages,
                title: data.title,
                excerpt: data.excerpt,
                percent: data.percent,
                status: `Reading Pages ${data.startPage}–${data.endPage}: "${data.title}"`,
              }))
            } else if (eventName === "step_thinking") {
              setIngestState(s => ({
                ...s,
                thinkingMsg: data.message,
              }))
            } else if (eventName === "raw_lesson_found") {
              const itemWithPage = {
                ...data.lesson,
                sourcePage: data.sourcePage,
                surface: data.lesson?.surface || "ALL",
              }
              setIngestState(s => ({
                ...s,
                lessonsLearned: [itemWithPage, ...s.lessonsLearned],
              }))
            } else if (eventName === "step_done") {
              setIngestState(s => ({
                ...s,
                percent: data.percent,
              }))
            } else if (eventName === "synthesis_start") {
              setIngestState(s => ({
                ...s,
                percent: data.percent || 92,
                status: data.message || "Pass 3: Synthesizing & deduplicating insights into master playbook directives...",
                thinkingMsg: "Consolidating, deduplicating, and assigning surface heuristics...",
              }))
            } else if (eventName === "complete") {
              const finalDirectives = Array.isArray(data.directives) && data.directives.length > 0
                ? data.directives.map((d: any) => ({
                    title: d.title,
                    instruction: d.instruction,
                    goodExample: d.goodExample,
                    badExample: d.badExample,
                    sourcePage: d.sourceRef,
                    surface: d.surface || "ALL",
                  }))
                : []

              setIngestState(s => ({
                ...s,
                percent: 100,
                completed: true,
                status: `Completely mastered and stored ${data.totalLessons} high-impact directives across ${data.totalPages} pages!`,
                lessonsLearned: finalDirectives.length > 0 ? finalDirectives : s.lessonsLearned,
              }))
              if (finalDirectives.length > 0) {
                setRecentDistilled(finalDirectives)
              }
              setDocText("")
              setDocPdf(null)
              if (fileRef.current) fileRef.current.value = ""
              fetchDocs()
              fetchRules()
              toast.success(`Distilled & stored ${data.totalLessons} master directives from ${data.totalPages} pages into memory!`)
            } else if (eventName === "error") {
              throw new Error(data.message || "Learning error")
            }
          } catch (parseErr) {
            console.error("Stream parse error:", parseErr)
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Distillation failed")
    } finally {
      setIngesting(false)
    }
  }

  async function deleteDocument(docId: string) {
    const doc = documents.find(d => d.id === docId)
    const prevDocs = documents
    const prevRules = rules

    // Optimistically update UI
    if (doc) {
      const docTitle = doc.title
      const titleWithoutExt = docTitle.replace(/\.(pdf|txt|md|epub|docx)$/i, "").trim().toLowerCase()
      setDocuments(prev => prev.filter(d => d.id !== docId))
      setRules(prev => prev.filter(r => {
        if (!r.sourceRef) return true
        const ref = r.sourceRef.toLowerCase()
        return !ref.includes(docTitle.toLowerCase()) && !ref.includes(titleWithoutExt) && !ref.includes(docId.toLowerCase())
      }))
    }

    try {
      const res = await fetch(`/api/admin/training/documents?id=${docId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete document")
      toast.success(data.message || "Document and its distilled directives removed")
      fetchDocs()
      fetchRules()
    } catch (err) {
      setDocuments(prevDocs)
      setRules(prevRules)
      toast.error(err instanceof Error ? err.message : "Delete failed")
    }
  }

  async function handleCreateManualRule() {
    if (!newRule.title.trim() || !newRule.instruction.trim()) {
      toast.error("Title and instruction are required")
      return
    }
    setSavingRule(true)
    try {
      const res = await fetch("/api/admin/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newRule.title,
          instruction: newRule.instruction,
          goodExample: newRule.goodExample || undefined,
          badExample: newRule.badExample || undefined,
          scope: newRule.scope,
          surface: newRule.surface,
          priority: 5,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save rule")
      setRules(prev => [data, ...prev])
      setShowAddRuleModal(false)
      setNewRule({ title: "", instruction: "", goodExample: "", badExample: "", scope: "global", surface: "ALL" })
      toast.success("Directive saved & active in AI brain")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create rule")
    } finally {
      setSavingRule(false)
    }
  }

  async function toggleRule(rule: Rule) {
    setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)))
    const res = await fetch(`/api/admin/training/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !rule.enabled }),
    }).catch(() => null)
    if (!res?.ok) {
      setRules(prev => prev.map(r => (r.id === rule.id ? { ...r, enabled: rule.enabled } : r)))
      toast.error("Toggle failed")
    }
  }

  async function deleteRule(id: string) {
    setRules(prev => prev.filter(r => r.id !== id))
    await fetch(`/api/admin/training/${id}`, { method: "DELETE" }).catch(() => {})
    toast.success("Directive removed")
  }

  // ── Sandbox Simulation & Teaching ──
  async function simulateSandbox(isRetry = false) {
    if (!sandboxScenario.trim()) {
      toast.error("Provide a prospect message or scenario first")
      return
    }
    setSimulating(true)
    if (isRetry) setPriorResponse(aiResponse)
    else { setPriorResponse(""); setLastLesson(null) }
    try {
      const res = await fetch("/api/admin/training/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surface: sandboxSurface, scope: sandboxScope, scenario: sandboxScenario }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Simulation failed")
      setAiResponse(data.response)
      setCorrection("")
      setFeedback("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulation failed")
    } finally {
      setSimulating(false)
    }
  }

  async function teachSandbox() {
    if (!correction.trim() && !feedback.trim()) {
      toast.error("Write a corrected version, feedback, or both")
      return
    }
    setTeaching(true)
    try {
      const res = await fetch("/api/admin/training/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface: sandboxSurface,
          scope: sandboxScope,
          scenario: sandboxScenario,
          aiResponse,
          correction,
          feedback,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Teaching failed")
      setLastLesson(data.lesson)
      setRules(prev => [data.rule, ...prev])
      toast.success("Lesson learned! Click 'Retry Scenario' to verify the AI's adaptation")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Teaching failed")
    } finally {
      setTeaching(false)
    }
  }

  // ── Sparring Turn Execution ──
  async function sparTurn(convo: { role: "agency" | "prospect"; text: string }[]) {
    const res = await fetch("/api/admin/training/spar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: sparScope, attitude: sparAttitude, prospect: sparProspect, conversation: convo }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Turn failed")
    return { msg: { role: data.role, text: data.text }, outcome: data.outcome }
  }

  async function runSparring(reset = true) {
    if (!sparProspect.trim()) {
      toast.error("Describe the prospect persona or company first")
      return
    }
    setSparRunning(true)
    sparStopRef.current = false
    let convo = reset ? [] : [...sparConvo]
    if (reset) { setSparConvo([]); setSparOutcome(null) }
    try {
      const maxMessages = convo.length + sparRounds * 2
      while (convo.length < maxMessages && !sparStopRef.current) {
        const turn = await sparTurn(convo)
        if (!turn) break
        convo = [...convo, turn.msg]
        setSparConvo(convo)
        if (turn.outcome === "booked" || turn.outcome === "lost") {
          setSparOutcome(turn.outcome as "booked" | "lost")
          return
        }
      }
      setSparOutcome("continue")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sparring error")
    } finally {
      setSparRunning(false)
    }
  }

  function loadIntoSandbox(text: string, context?: string) {
    setSandboxSurface("REPLY")
    setSandboxScenario(context || "Prospect message")
    setAiResponse(text)
    setCorrection("")
    setFeedback("")
    setActiveTab("sandbox")
    toast.info("Loaded into Sandbox — adapt the lesson and save")
  }

  // Filter Rules by Playbook Lens & Search
  const filteredRules = rules.filter(r => {
    const matchesLens = activeLens === "all" || r.scope === "global" || r.scope === activeLens
    const matchesSearch = !searchQuery.trim() ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.instruction.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.goodExample && r.goodExample.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesLens && matchesSearch
  })

  const TABS = [
    { id: "ingest" as const, label: "Knowledge & PDF Ingest", icon: FileUpIcon, badge: documents.length || undefined },
    { id: "rules" as const, label: "AI Directives & Mindset", icon: BrainIcon, badge: filteredRules.length },
    { id: "sandbox" as const, label: "Scenario Sandbox & Teach", icon: GradIcon },
    { id: "spar" as const, label: "Sparring Arena", icon: SwordsIcon },
    { id: "radar" as const, label: "Multi-Tenant Radar", icon: ActivityIcon, badge: conversations.length || undefined },
    { id: "export" as const, label: "Model Weights & Export", icon: CpuIcon },
  ]

  return (
    <div className="space-y-6">
      {/* ── 1. Top-Bar Playbook Lens Bar ─────────────────────────────── */}
      <div className="p-2 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-black/50 to-violet-950/30 border border-white/[0.08] backdrop-blur-2xl shadow-xl flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3 py-1">
          <span className="text-[10px] font-black uppercase tracking-[.18em] text-white/40">Playbook Lens:</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {PLAYBOOK_LENSES.map(lens => {
            const active = activeLens === lens.id
            return (
              <button
                key={lens.id}
                onClick={() => {
                  setActiveLens(lens.id)
                  if (lens.id !== "all") {
                    setDocScope(lens.id)
                    setSandboxScope(lens.id)
                    setSparScope(lens.id)
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl text-[12px] font-bold transition-all shrink-0 ${
                  active
                    ? "bg-white text-black shadow-lg"
                    : "bg-white/[0.03] text-white/50 border border-white/[0.06] hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <span>{lens.icon}</span>
                <span>{lens.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 2. Fluid Mode Switcher Bar ─────────────────────────────────── */}
      <div className="relative p-1.5 rounded-2xl bg-gradient-to-r from-white/[0.05] via-white/[0.02] to-white/[0.05] border border-white/[0.08] backdrop-blur-2xl shadow-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {TABS.map(t => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12.5px] font-semibold transition-all shrink-0 select-none ${
                  active
                    ? "text-white bg-gradient-to-r from-violet-600/40 via-indigo-600/40 to-cyan-600/30 border border-white/20 shadow-lg shadow-indigo-500/10"
                    : "text-white/50 hover:text-white/85 hover:bg-white/[0.04]"
                }`}
              >
                <Icon className={`size-4 ${active ? "text-cyan-300" : "text-white/40"}`} />
                <span>{t.label}</span>
                {t.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                      active ? "bg-cyan-400/20 text-cyan-200 border border-cyan-400/30" : "bg-white/10 text-white/50"
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══ TAB 1: KNOWLEDGE & PDF INGESTION ══ */}
      {activeTab === "ingest" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/30 via-black/50 to-violet-950/30 border border-indigo-500/20 backdrop-blur-2xl space-y-2">
            <div className="flex items-center gap-2">
              <BookIcon className="size-4 text-cyan-300" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                Source Knowledge &amp; Book Ingestion Hub
              </h3>
            </div>
            <p className="text-[12px] text-white/50 max-w-3xl leading-relaxed">
              Upload sales books, training PDFs, brand guidelines, or paste call transcripts. The engine distills them into permanent, high-impact behavioral directives that guide how the AI writes and negotiates.
            </p>
          </div>

          {/* Upload & Distill Form */}
          <div className="rounded-3xl border border-white/[0.08] bg-black/40 p-6 space-y-4 backdrop-blur-xl">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-white/40 mb-1 block">Material Title</label>
                <input
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  placeholder="e.g. Never Split the Difference / B2B Outreach Guide"
                  className="w-full px-3.5 py-2.5 rounded-xl text-[12.5px] bg-black/60 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-white/40 mb-1 block">Target Playbook</label>
                <select
                  value={docScope}
                  onChange={e => setDocScope(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[12.5px] bg-black/60 border border-white/10 text-white outline-none focus:border-indigo-500"
                >
                  {SCOPES.map(s => <option key={s.value} value={s.value} className="bg-[#181a24]">{s.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10.5px] font-bold uppercase tracking-wider text-white/40 mb-1 block">Target Surface</label>
                <select
                  value={docSurface}
                  onChange={e => setDocSurface(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[12.5px] bg-black/60 border border-white/10 text-white outline-none focus:border-indigo-500"
                >
                  {SURFACES_ALL.map(s => <option key={s.value} value={s.value} className="bg-[#181a24]">{s.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10.5px] font-bold uppercase tracking-wider text-white/40 mb-1 block">Paste Text or Upload PDF</label>
              <textarea
                value={docText}
                onChange={e => { setDocText(e.target.value); if (e.target.value) setDocPdf(null) }}
                rows={5}
                placeholder="Paste book chapters, methodology rules, objection scripts, or call notes here..."
                className="w-full px-4 py-3 rounded-2xl text-[12.5px] bg-black/50 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-indigo-500 resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold text-white/70 border border-white/10 hover:text-white hover:bg-white/[0.04] transition-all"
                >
                  <FileUpIcon className="size-3.5" /> Attach PDF / TXT / MD File
                </button>
                <input ref={fileRef} type="file" accept=".pdf,.txt,.md" onChange={onFileSelected} className="hidden" />
                {docPdf && <span className="text-[12px] text-cyan-300 font-semibold">{docPdf.name} attached</span>}
              </div>

              <button
                onClick={ingestDocument}
                disabled={ingesting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[12.5px] font-bold bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10 transition-all"
              >
                {ingesting ? (
                  <>
                    <LoaderIcon className="size-3.5 animate-spin" /> Distilling Directives...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="size-3.5 text-indigo-600" /> Distill &amp; Ingest into Brain
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Live Page-by-Page AI Document Scanner & Learning Studio */}
          {ingestState.isStreaming && (
            <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-indigo-950/60 via-black/80 to-purple-950/40 p-6 space-y-5 shadow-2xl backdrop-blur-2xl animate-fade-in relative overflow-hidden">
              {/* Glowing Scanline Animation Header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex size-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full size-3 bg-cyan-500" />
                  </div>
                  <div>
                    <span className="text-[12px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      AI Document Scanner Active
                    </span>
                    {ingestState.totalPages > 0 && (
                      <p className="text-[11px] text-white/50">
                        Analyzing Page <strong className="text-white font-bold">{ingestState.startPage || 1}–{ingestState.endPage || 1}</strong> of {ingestState.totalPages} (Step {ingestState.currentStep} of {ingestState.totalSteps})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11.5px] font-medium text-white/50 bg-white/[0.04] px-3 py-1 rounded-xl border border-white/10">
                    Directives in Memory: <strong className="text-emerald-400 font-bold">{ingestState.lessonsLearned.length}</strong>
                  </span>
                  <span className="text-[12.5px] font-mono font-bold text-white bg-indigo-500/30 border border-indigo-500/40 px-3 py-1 rounded-xl">
                    {ingestState.percent}%
                  </span>
                </div>
              </div>

              {/* Live PDF Text Excerpt Inspection Window */}
              <div className="rounded-2xl border border-white/10 bg-black/70 p-4 space-y-2 relative overflow-hidden">
                <div className="flex items-center justify-between text-[11px] font-bold text-white/40 uppercase tracking-wider border-b border-white/10 pb-2">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <FileTextIcon className="size-3.5" /> {ingestState.title || "Document Stream Buffer"}
                  </span>
                  {ingestState.startPage > 0 && (
                    <span className="text-indigo-400 font-mono">
                      PDF Pages {ingestState.startPage}–{ingestState.endPage}
                    </span>
                  )}
                </div>

                {/* Excerpt text with reading glow */}
                <div className="relative pt-1 min-h-[48px]">
                  {ingestState.excerpt ? (
                    <p className="text-[12px] text-white/80 font-mono italic leading-relaxed select-none">
                      {ingestState.excerpt}
                    </p>
                  ) : (
                    <p className="text-[11.5px] text-white/30 italic">
                      Scanning text layers and parsing logical structure...
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10.5px] text-white/40 pt-1">
                  <span className="flex items-center gap-1 text-emerald-400/90 font-medium">
                    <CpuIcon className="size-3 animate-pulse" /> {ingestState.thinkingMsg || "Distilling actionable sales rules..."}
                  </span>
                  <span className="text-white/30">Live PDF Reader</span>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden p-[2px]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-500 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(99,102,241,0.6)]"
                    style={{ width: `${Math.max(4, ingestState.percent)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-white/50">
                  <span className="truncate max-w-md font-medium text-white/70">
                    {ingestState.status}
                  </span>
                  <span className="shrink-0 font-bold text-white/60">
                    {ingestState.currentStep} of {ingestState.totalSteps} steps completed
                  </span>
                </div>
              </div>

              {/* Real-time Streaming Directives Feed */}
              {ingestState.lessonsLearned.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                  <div className="flex items-center justify-between">
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-white/40">
                      Live Memory Feed (Stored to DB in Real-Time):
                    </p>
                    <span className="text-[10px] text-emerald-400/80 font-mono">
                      ✓ Auto-saved to memory
                    </span>
                  </div>
                  <div className="grid gap-2 max-h-64 overflow-y-auto pr-1">
                    {ingestState.lessonsLearned.map((l, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-black/60 border border-emerald-500/20 flex items-start gap-2.5 animate-slide-up">
                        <CheckIcon className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[12.5px] font-bold text-white truncate">{l.title}</p>
                            {l.sourcePage && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-cyan-300 shrink-0">
                                {l.sourcePage}
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-white/70 leading-relaxed">{l.instruction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Master Playbook Results Deck (Pass 3 Synthesis Complete) */}
          {!ingestState.isStreaming && recentDistilled.length > 0 && (
            <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 via-black/60 to-black/80 p-6 space-y-4 shadow-2xl backdrop-blur-2xl animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="size-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <h3 className="text-[13px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-2">
                      Master Playbook Synthesized ({recentDistilled.length} Directives)
                    </h3>
                    <p className="text-[11px] text-white/50">
                      Consolidated from all book chapters &amp; permanently saved to AI memory
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("rules")}
                    className="text-[11.5px] font-bold text-black bg-emerald-400 hover:bg-emerald-300 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    View in AI Directives <ArrowRight className="size-3" />
                  </button>
                </div>
              </div>

              {/* Surface Category Filter Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap border-y border-white/[0.08] py-2.5">
                {[
                  { id: "ALL", label: `All (${recentDistilled.length})` },
                  { id: "EMAIL", label: `📧 Cold Emails (${recentDistilled.filter(d => (d.surface || "ALL") === "EMAIL").length})` },
                  { id: "REPLY", label: `💬 Replies & Objections (${recentDistilled.filter(d => (d.surface || "ALL") === "REPLY").length})` },
                  { id: "PROPOSAL", label: `📑 Proposals & Offers (${recentDistilled.filter(d => (d.surface || "ALL") === "PROPOSAL").length})` },
                  { id: "ADVISOR", label: `🧠 Strategic Copilot (${recentDistilled.filter(d => (d.surface || "ALL") === "ADVISOR").length})` },
                ].map(tab => {
                  const isActive = deckSurfaceFilter === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setDeckSurfaceFilter(tab.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-all",
                        isActive
                          ? "bg-white text-black shadow-md"
                          : "bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]"
                      )}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* Directive Cards Grid */}
              <div className="grid gap-3 pt-1">
                {recentDistilled
                  .filter(d => deckSurfaceFilter === "ALL" || (d.surface || "ALL") === deckSurfaceFilter)
                  .map((l, i) => {
                    const surfaceColor =
                      l.surface === "EMAIL"
                        ? "text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
                        : l.surface === "REPLY"
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : l.surface === "PROPOSAL"
                        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                        : l.surface === "ADVISOR"
                        ? "text-purple-400 bg-purple-500/10 border-purple-500/20"
                        : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"

                    return (
                      <div key={i} className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2 hover:border-white/20 transition-all">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border", surfaceColor)}>
                              {l.surface || "ALL"}
                            </span>
                            <h4 className="text-[13px] font-bold text-white">{l.title}</h4>
                          </div>
                          {l.sourcePage && (
                            <span className="text-[10.5px] font-mono text-white/40 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.06]">
                              {l.sourcePage}
                            </span>
                          )}
                        </div>

                        <p className="text-[12px] text-white/80 leading-relaxed font-medium">
                          {l.instruction}
                        </p>

                        {(l.goodExample || l.badExample) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-[11px]">
                            {l.goodExample && (
                              <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-emerald-300">
                                <span className="font-bold uppercase tracking-wider text-[9.5px] text-emerald-400 block mb-1">
                                  ✓ Good Heuristic:
                                </span>
                                <p className="italic leading-relaxed">{l.goodExample}</p>
                              </div>
                            )}
                            {l.badExample && (
                              <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/20 text-red-300">
                                <span className="font-bold uppercase tracking-wider text-[9.5px] text-red-400 block mb-1">
                                  ✗ Counter-Pattern (Avoid):
                                </span>
                                <p className="italic leading-relaxed">{l.badExample}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Uploaded Documents Library */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white/50">
                Uploaded Source Library ({documents.length})
              </h4>
              <button onClick={fetchDocs} className="text-xs text-white/40 hover:text-white">Refresh</button>
            </div>

            {loadingDocs ? (
              <div className="py-8 text-center text-white/30"><LoaderIcon className="size-5 animate-spin mx-auto" /></div>
            ) : documents.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed border-white/10 text-center text-white/30 text-xs">
                No documents uploaded yet. Upload a sales book or training guide above to build your custom intelligence.
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {documents.map(doc => (
                  <div key={doc.id} className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] flex items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileTextIcon className="size-4 text-cyan-300 shrink-0" />
                        <h5 className="text-[13px] font-bold text-white truncate">{doc.title}</h5>
                      </div>
                      <p className="text-[11px] text-white/40">
                        {doc.lessonsCount} lessons distilled • Scope: {doc.scope.toUpperCase()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteDocument(doc.id)}
                      className="p-2 rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all shrink-0"
                      title="Delete document and its rules"
                    >
                      <TrashIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB 2: ACTIVE DIRECTIVES & MINDSET ══ */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-indigo-950/20 via-black/40 to-violet-950/20 border border-white/10 backdrop-blur-2xl">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                Active Mindset &amp; Behavioral Directives ({activeLens.toUpperCase()})
              </h3>
              <p className="text-[12px] text-white/40">
                These directives are injected into live generations. Toggle off, edit, or add custom rules anytime.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search directives..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-[12px] bg-black/50 border border-white/10 text-white placeholder:text-white/30 outline-none"
                />
              </div>

              <button
                onClick={() => setShowAddRuleModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12px] font-bold bg-white text-black hover:bg-white/90 shadow-md transition-all shrink-0"
              >
                <PlusIcon className="size-3.5" /> Add Directive
              </button>
            </div>
          </div>

          {/* Add Directive Modal */}
          {showAddRuleModal && (
            <div className="p-6 rounded-3xl bg-gradient-to-b from-indigo-950/50 to-black/90 border border-indigo-500/30 backdrop-blur-2xl space-y-4 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Create Custom Behavioral Directive</h4>
                <button onClick={() => setShowAddRuleModal(false)} className="text-xs text-white/40 hover:text-white">Close</button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  placeholder="Directive Name (e.g. Label Negative Subtext)"
                  value={newRule.title}
                  onChange={e => setNewRule(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[12.5px] bg-black/60 border border-white/10 text-white placeholder:text-white/30 outline-none"
                />
                <select
                  value={newRule.scope}
                  onChange={e => setNewRule(p => ({ ...p, scope: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[12.5px] bg-black/60 border border-white/10 text-white outline-none"
                >
                  {SCOPES.map(s => <option key={s.value} value={s.value} className="bg-[#181a24]">{s.label}</option>)}
                </select>
                <select
                  value={newRule.surface}
                  onChange={e => setNewRule(p => ({ ...p, surface: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl text-[12.5px] bg-black/60 border border-white/10 text-white outline-none"
                >
                  {SURFACES_ALL.map(s => <option key={s.value} value={s.value} className="bg-[#181a24]">{s.label}</option>)}
                </select>
              </div>

              <textarea
                placeholder="Imperative instruction: Exactly what the AI must do (e.g. When prospect pushes back, agree that they might not need help first)..."
                value={newRule.instruction}
                onChange={e => setNewRule(p => ({ ...p, instruction: e.target.value }))}
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl text-[12.5px] bg-black/60 border border-white/10 text-white placeholder:text-white/30 outline-none resize-none"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  placeholder="Do it like this: (Good Example)"
                  value={newRule.goodExample}
                  onChange={e => setNewRule(p => ({ ...p, goodExample: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl text-[12px] bg-black/60 border border-white/10 text-white placeholder:text-white/30 outline-none"
                />
                <input
                  placeholder="Never like this: (Bad Example)"
                  value={newRule.badExample}
                  onChange={e => setNewRule(p => ({ ...p, badExample: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl text-[12px] bg-black/60 border border-white/10 text-white placeholder:text-white/30 outline-none"
                />
              </div>

              <button
                onClick={handleCreateManualRule}
                disabled={savingRule}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12.5px] font-bold bg-white text-black hover:bg-white/90 shadow-lg transition-all"
              >
                {savingRule ? <LoaderIcon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5 text-indigo-600" />}
                Save Directive
              </button>
            </div>
          )}

          {/* Rules List */}
          {loadingRules ? (
            <div className="py-16 text-center text-white/30"><LoaderIcon className="size-6 animate-spin mx-auto text-indigo-400" /></div>
          ) : filteredRules.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-white/30 text-xs">
              No directives found for this scope. Upload a book or add a custom rule above.
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredRules.map(rule => (
                <div
                  key={rule.id}
                  className={`rounded-2xl border p-4.5 transition-all ${
                    rule.enabled
                      ? "border-white/[0.08] bg-white/[0.02]"
                      : "border-white/[0.04] bg-white/[0.005] opacity-40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13.5px] font-bold text-white">{rule.title}</span>
                        <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/25 text-indigo-300">
                          {rule.scope}
                        </span>
                        <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-white/50">
                          {rule.surface}
                        </span>
                        {rule.sourceRef && (
                          <span className="text-[9.5px] text-cyan-300/80 font-mono">
                            via {rule.sourceRef}
                          </span>
                        )}
                      </div>

                      <p className="text-[12.5px] text-white/80 leading-relaxed">{rule.instruction}</p>

                      {(rule.goodExample || rule.badExample) && (
                        <div className="pt-1.5 space-y-1 text-[11.5px]">
                          {rule.goodExample && (
                            <p className="text-emerald-300/90 font-mono">✓ &ldquo;{rule.goodExample}&rdquo;</p>
                          )}
                          {rule.badExample && (
                            <p className="text-rose-300/90 font-mono">✕ &ldquo;{rule.badExample}&rdquo;</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleRule(rule)}
                        className={`p-2 rounded-xl transition-all ${
                          rule.enabled
                            ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                            : "text-white/30 bg-white/[0.04] hover:bg-white/[0.08]"
                        }`}
                        title={rule.enabled ? "Disable Rule" : "Enable Rule"}
                      >
                        <PowerIcon className="size-3.5" />
                      </button>
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="p-2 rounded-xl text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        title="Delete Rule"
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 3: SCENARIO SANDBOX & TEACH ══ */}
      {activeTab === "sandbox" && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/20 via-black/40 to-pink-950/20 border border-purple-500/20 backdrop-blur-2xl space-y-1">
            <div className="flex items-center gap-2">
              <GradIcon className="size-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Interactive Scenario Sandbox &amp; Teach</h3>
            </div>
            <p className="text-[12px] text-white/40">
              Simulate any prospect response, inspect what the AI says, and teach it exactly how you want it to reply.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={sandboxSurface}
              onChange={e => setSandboxSurface(e.target.value)}
              className="px-3.5 py-2 rounded-xl text-[12px] bg-black/60 border border-white/10 text-white outline-none"
            >
              {SURFACES.map(s => <option key={s.value} value={s.value} className="bg-[#181a24]">{s.label}</option>)}
            </select>
            <select
              value={sandboxScope}
              onChange={e => setSandboxScope(e.target.value)}
              className="px-3.5 py-2 rounded-xl text-[12px] bg-black/60 border border-white/10 text-white outline-none"
            >
              {SCOPES.map(s => <option key={s.value} value={s.value} className="bg-[#181a24]">{s.label}</option>)}
            </select>
          </div>

          <textarea
            value={sandboxScenario}
            onChange={e => setSandboxScenario(e.target.value)}
            rows={3}
            placeholder={sandboxSurface === "REPLY" ? `"We already have 3 internal SDRs handling all our outbound."` : "Describe the prospect, company, and situation..."}
            className="w-full px-4 py-3 rounded-2xl text-[12.5px] bg-black/50 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-purple-400/50 resize-none font-sans"
          />

          <button
            onClick={() => simulateSandbox(false)}
            disabled={simulating || teaching}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12.5px] font-bold bg-white text-black hover:bg-white/90 shadow-lg transition-all"
          >
            {simulating && !priorResponse ? <LoaderIcon className="size-3.5 animate-spin" /> : <SparklesIcon className="size-3.5 text-purple-600" />}
            Generate Live Production Reply
          </button>

          {priorResponse && (
            <div className="rounded-2xl border border-white/[0.06] bg-black/40 p-4 opacity-60 space-y-1">
              <p className="text-[9.5px] font-black uppercase tracking-wider text-white/30">Before Lesson</p>
              <pre className="text-[12px] text-white/60 whitespace-pre-wrap font-sans leading-relaxed">{priorResponse}</pre>
            </div>
          )}

          {aiResponse && (
            <div className={`rounded-3xl border p-5 space-y-2 ${priorResponse ? "border-emerald-500/30 bg-emerald-500/[0.04]" : "border-white/[0.08] bg-black/40"}`}>
              <div className="flex items-center justify-between">
                <p className={`text-[9.5px] font-black uppercase tracking-wider ${priorResponse ? "text-emerald-300" : "text-white/40"}`}>
                  {priorResponse ? "After Lesson (Applied Live)" : "AI Generated Response"}
                </p>
                {lastLesson && (
                  <button
                    onClick={() => simulateSandbox(true)}
                    disabled={simulating}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-purple-300 hover:text-purple-200 transition-colors"
                  >
                    {simulating ? <LoaderIcon className="size-3 animate-spin" /> : <RefreshIcon className="size-3" />} Retry Scenario
                  </button>
                )}
              </div>
              <pre className="text-[12.5px] text-white/90 whitespace-pre-wrap font-sans leading-relaxed">{aiResponse}</pre>
            </div>
          )}

          {aiResponse && (
            <div className="rounded-3xl border border-purple-500/25 bg-gradient-to-b from-purple-950/30 to-black/60 p-5 space-y-3.5 shadow-xl">
              <p className="text-[11px] font-black uppercase tracking-wider text-purple-300">Teach &amp; Correct</p>
              <textarea
                value={correction}
                onChange={e => setCorrection(e.target.value)}
                rows={3}
                placeholder="Rewrite the response in your exact voice and preferred style..."
                className="w-full px-3.5 py-2.5 rounded-xl text-[12.5px] bg-black/60 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-purple-500 resize-none font-sans"
              />
              <input
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Underlying rule: e.g. Agree that their in-house team is great, then ask a calibrated question about manual scraping"
                className="w-full px-3.5 py-2.5 rounded-xl text-[12.5px] bg-black/60 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-purple-500"
              />
              <button
                onClick={teachSandbox}
                disabled={teaching || simulating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12.5px] font-bold bg-white text-black hover:bg-white/90 shadow-lg transition-all"
              >
                {teaching ? <LoaderIcon className="size-3.5 animate-spin" /> : <GradIcon className="size-3.5 text-purple-600" />}
                Save Permanent Lesson
              </button>
            </div>
          )}

          {lastLesson && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4.5 space-y-1 animate-fade-in">
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Permanent Lesson Active</p>
              <p className="text-[13px] font-bold text-white">{lastLesson.title}</p>
              <p className="text-[12px] text-white/60">{lastLesson.instruction}</p>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 4: SPARRING ARENA ══ */}
      {activeTab === "spar" && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-950/20 via-black/40 to-amber-950/20 border border-rose-500/20 backdrop-blur-2xl space-y-1">
            <div className="flex items-center gap-2">
              <SwordsIcon className="size-4 text-rose-400" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Adversarial Sparring Arena</h3>
            </div>
            <p className="text-[12px] text-white/40">
              The AI spars against a simulated skeptical prospect in a live multi-round dialogue to test trained directives.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select value={sparScope} onChange={e => setSparScope(e.target.value)} className="px-3.5 py-2 rounded-xl text-[12px] bg-black/60 border border-white/10 text-white outline-none" disabled={sparRunning}>
              {SCOPES.map(s => <option key={s.value} value={s.value} className="bg-[#181a24]">{s.label}</option>)}
            </select>
            <select value={sparAttitude} onChange={e => setSparAttitude(e.target.value)} className="px-3.5 py-2 rounded-xl text-[12px] bg-black/60 border border-white/10 text-white outline-none" disabled={sparRunning}>
              {ATTITUDES.map(a => <option key={a.value} value={a.value} className="bg-[#181a24]">{a.label}</option>)}
            </select>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/50 border border-white/10">
              <span className="text-[10.5px] font-bold uppercase text-white/40">Rounds</span>
              <input
                type="number"
                min={1}
                max={6}
                value={sparRounds}
                disabled={sparRunning}
                onChange={e => setSparRounds(Math.max(1, Math.min(6, Number(e.target.value) || 3)))}
                className="w-10 text-center bg-transparent text-white text-[12px] font-bold outline-none"
              />
            </div>
          </div>

          <textarea
            value={sparProspect}
            onChange={e => setSparProspect(e.target.value)}
            rows={2}
            disabled={sparRunning}
            placeholder="e.g. Managing Partner at a commercial legal firm, burned by previous agencies, skeptical of cold outreach."
            className="w-full px-4 py-3 rounded-2xl text-[12.5px] bg-black/50 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-rose-400/50 resize-none font-sans"
          />

          <div className="flex items-center gap-3">
            {!sparRunning ? (
              <>
                <button
                  onClick={() => runSparring(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12.5px] font-bold bg-gradient-to-r from-rose-500 to-amber-500 text-white hover:brightness-110 shadow-lg transition-all"
                >
                  <PlayIcon className="size-3.5" /> Launch Sparring Match
                </button>
                {sparConvo.length > 0 && sparOutcome === "continue" && (
                  <button
                    onClick={() => runSparring(false)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold text-white/70 border border-white/10 hover:text-white hover:bg-white/[0.04] transition-all"
                  >
                    <RefreshIcon className="size-3.5" /> Continue {sparRounds} More Rounds
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => { sparStopRef.current = true }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12.5px] font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
              >
                <SquareIcon className="size-3.5" /> Abort Match
              </button>
            )}
          </div>

          {sparConvo.length > 0 && (
            <div className="space-y-3 rounded-3xl border border-white/[0.08] bg-black/60 p-6 shadow-2xl">
              {sparConvo.map((m, i) => (
                <div key={i} className={`flex ${m.role === "agency" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-3xl px-4.5 py-3.5 shadow-md space-y-1.5 ${
                      m.role === "agency"
                        ? "bg-gradient-to-br from-indigo-950/40 to-violet-950/40 border border-indigo-500/30 text-indigo-50"
                        : "bg-white/[0.03] border border-white/[0.07] text-white/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className={`text-[9.5px] font-black uppercase tracking-wider ${m.role === "agency" ? "text-cyan-300" : "text-rose-300"}`}>
                        {m.role === "agency" ? "Alex (Agency AI)" : "Prospect"}
                      </span>
                      {m.role === "agency" && !sparRunning && (
                        <button
                          onClick={() => loadIntoSandbox(m.text, sparProspect)}
                          className="flex items-center gap-1 text-[10.5px] font-bold text-white/40 hover:text-cyan-300 transition-colors"
                        >
                          <GradIcon className="size-3" /> Adapt in Sandbox
                        </button>
                      )}
                    </div>
                    <pre className="text-[12.5px] whitespace-pre-wrap font-sans leading-relaxed">{m.text}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 5: MULTI-TENANT RADAR ══ */}
      {activeTab === "radar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 p-5 rounded-3xl bg-gradient-to-r from-cyan-950/20 via-black/40 to-blue-950/20 border border-cyan-500/20 backdrop-blur-2xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">Live Multi-Tenant Interaction Radar</h3>
              </div>
              <p className="text-[12px] text-white/40">
                Audit pending AI drafts and replies across all agency workspaces. 1-click load any output into the Sandbox to correct.
              </p>
            </div>

            <button
              onClick={() => {
                setLoadingConversations(true)
                fetch("/api/admin/conversations?limit=40")
                  .then(r => r.json())
                  .then(d => setConversations(d.items || []))
                  .finally(() => setLoadingConversations(false))
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold text-white bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] transition-all"
            >
              <RefreshIcon className={`size-3.5 ${loadingConversations ? "animate-spin" : ""}`} />
              Refresh Radar
            </button>
          </div>

          {loadingConversations ? (
            <div className="flex items-center justify-center py-20 text-white/30">
              <LoaderIcon className="size-8 animate-spin text-cyan-400" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-white/30 text-xs">
              No live interactions detected yet.
            </div>
          ) : (
            <div className="grid gap-3">
              {conversations.map(item => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-white/[0.08] bg-gradient-to-r from-white/[0.03] to-white/[0.01] hover:border-cyan-500/30 transition-all p-5 space-y-3.5 shadow-md"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[12px] font-bold text-white">{item.agency.name}</span>
                      <span className="text-[10.5px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/50">
                        Lead: {item.lead.name} @ {item.lead.company}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          item.status === "APPROVED" || item.status === "AUTO_EXECUTED"
                            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                            : item.status === "REJECTED"
                            ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
                            : "bg-amber-500/10 border-amber-500/25 text-amber-300"
                        }`}
                      >
                        {item.status}
                      </span>
                      <button
                        onClick={() => loadIntoSandbox(item.draftBody, item.prospectReply || undefined)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 transition-all"
                      >
                        <ZapIcon className="size-3" /> Patch in Sandbox
                      </button>
                    </div>
                  </div>

                  {item.prospectReply && (
                    <div className="rounded-2xl bg-black/40 border border-white/[0.05] p-3 text-[12px]">
                      <p className="text-[9.5px] font-bold uppercase tracking-wider text-white/30 mb-1">Prospect Inquiry</p>
                      <p className="text-white/75 italic">&ldquo;{item.prospectReply}&rdquo;</p>
                    </div>
                  )}

                  <div className="rounded-2xl bg-gradient-to-br from-black/60 to-black/40 border border-white/[0.08] p-4 text-[12.5px] space-y-1.5">
                    <p className="text-[9.5px] font-bold uppercase tracking-wider text-cyan-300">AI Closer Draft</p>
                    <pre className="text-white/85 whitespace-pre-wrap font-sans leading-relaxed">{item.draftBody}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB 6: DATASET PIPELINE & EXPORT ══ */}
      {activeTab === "export" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3 p-5 rounded-3xl bg-gradient-to-r from-emerald-950/20 via-black/40 to-teal-950/20 border border-emerald-500/20 backdrop-blur-2xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CpuIcon className="size-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white tracking-wide uppercase">Fine-Tuning Dataset Pipeline</h3>
              </div>
              <p className="text-[12px] text-white/40">
                Export approved conversations and your manually taught directives into standard 80/20 Train / Validation JSONL splits.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`/api/admin/training/export?split=train&playbookType=${activeLens}`}
                download
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold bg-gradient-to-r from-emerald-400 to-teal-400 text-black hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <DownloadIcon className="size-3.5" /> Train Set (80%)
              </a>
              <a
                href={`/api/admin/training/export?split=val&playbookType=${activeLens}`}
                download
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold bg-white/[0.08] text-white hover:bg-white/[0.15] border border-white/10 transition-all"
              >
                <DownloadIcon className="size-3.5" /> Validation (20%)
              </a>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 space-y-2 backdrop-blur-xl">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Active Inference Engine</p>
              <p className="text-2xl font-black text-white font-mono">DeepSeek V4 Pro</p>
              <p className="text-[11.5px] text-emerald-300 flex items-center gap-1.5 pt-1">
                <span className="size-1.5 rounded-full bg-emerald-400" /> User Directives Injected
              </p>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 space-y-2 backdrop-blur-xl">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Active Directives</p>
              <p className="text-2xl font-black text-indigo-300 font-mono">{filteredRules.length} Rules</p>
              <p className="text-[11.5px] text-white/40 pt-1">Filtered by {activeLens.toUpperCase()}</p>
            </div>

            <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 space-y-2 backdrop-blur-xl">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">Source Library</p>
              <p className="text-2xl font-black text-cyan-300 font-mono">{documents.length} Documents</p>
              <p className="text-[11.5px] text-white/40 pt-1">Custom PDFs &amp; Materials</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
