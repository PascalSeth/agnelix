/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import {
  Radio,
  Search,
  ExternalLink,
  Copy,
  Check,
  BookmarkPlus,
  Send,
  Loader2,
  Clock,
  Flame,
  ShieldCheck,
  Home,
  PartyPopper,
  Car,
  HeartPulse,
  Briefcase,
  Laptop,
  MapPin,
  ChevronDown,
  ChevronUp,
  Globe,
  SlidersHorizontal,
} from "lucide-react"
import { Sparkles } from "@/components/ui/chat-bubble-icon"
import { toast } from "sonner"
import { MULTI_VERTICAL_PRESETS, type SocialIntentPost, type VerticalPreset } from "@/lib/social-constants"

const card = {
  background: "linear-gradient(145deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.01) 100%)",
  border: "1px solid rgba(255,255,255,.07)",
}

const activeTabStyle = {
  background: "rgba(99,102,241,0.18)",
  border: "1px solid rgba(99,102,241,0.4)",
  color: "#a5b4fc",
}

export default function SocialRadarPage() {
  const { status } = useSession()
  const [selectedPresetId, setSelectedPresetId] = useState<string>("home_services")
  const [query, setQuery] = useState<string>("roofing contractor recommendation")
  const [subreddit, setSubreddit] = useState<string>("")
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "year">("month")

  const [loading, setLoading] = useState(false)
  const [posts, setPosts] = useState<SocialIntentPost[]>([])
  const [searched, setSearched] = useState(false)

  // Pitch generation state per post id
  const [pitches, setPitches] = useState<
    Record<
      string,
      {
        dmMessage: string
        publicComment: string
        extractedNeed: string
        estimatedFit: string
        activeTab: "dm" | "comment"
      }
    >
  >({})
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (status === "authenticated") {
      handleSearch("roofing contractor recommendation", "")
    }
  }, [status])

  function handleSelectPreset(preset: VerticalPreset) {
    setSelectedPresetId(preset.id)
    const initialQuery = preset.keywords[0]
    setQuery(initialQuery)
    handleSearch(initialQuery, subreddit)
  }

  async function handleSearch(searchQuery = query, targetSub = subreddit) {
    if (!searchQuery.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch("/api/social-radar/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          subreddit: targetSub.trim() || undefined,
          timeframe,
        }),
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.results)) {
        setPosts(data.results)
        toast.success(`Found ${data.results.length} active consumer / buyer requests`)
      } else {
        toast.error(data.error || "Search returned no posts")
      }
    } catch {
      toast.error("Failed to scan for consumer posts")
    } finally {
      setLoading(false)
    }
  }

  async function handleGeneratePitch(post: SocialIntentPost) {
    setGeneratingId(post.id)
    try {
      const res = await fetch("/api/social-radar/generate-pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postTitle: post.title,
          postBody: post.body,
          author: post.author,
          platform: post.platform,
          subreddit: post.subreddit,
        }),
      })
      const data = await res.json()
      if (data.success && data.pitch) {
        setPitches((prev) => ({
          ...prev,
          [post.id]: {
            ...data.pitch,
            activeTab: "dm",
          },
        }))
        toast.success(`Drafted bespoke pitch for ${post.author}`)
      } else {
        toast.error("Failed to draft AI response")
      }
    } catch {
      toast.error("AI draft generation failed")
    } finally {
      setGeneratingId(null)
    }
  }

  async function handleSaveLead(post: SocialIntentPost) {
    setSavingId(post.id)
    const pitch = pitches[post.id]
    try {
      const res = await fetch("/api/social-radar/import-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: post.title,
          body: post.body,
          author: post.author,
          platform: post.platform,
          subreddit: post.subreddit,
          permalink: post.permalink,
          matchedKeyword: post.matchedKeyword,
          intentCategory: post.intentCategory,
          dmMessage: pitch?.dmMessage,
          publicComment: pitch?.publicComment,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSavedIds((prev) => new Set([...prev, post.id]))
        toast.success("Lead & AI Task imported to Gale Pipeline!")
      } else {
        toast.error("Failed to import lead")
      }
    } catch {
      toast.error("Lead import error")
    } finally {
      setSavingId(null)
    }
  }

  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success("Message copied to clipboard!")
    setTimeout(() => setCopiedId(null), 2500)
  }

  function getCategoryIcon(cat: string) {
    switch (cat) {
      case "HOME_SERVICES":
        return <Home className="size-3.5 text-amber-400" />
      case "EVENTS_WEDDINGS":
        return <PartyPopper className="size-3.5 text-pink-400" />
      case "TRANSPORTATION":
        return <Car className="size-3.5 text-sky-400" />
      case "HEALTH_WELLNESS":
        return <HeartPulse className="size-3.5 text-rose-400" />
      case "PROFESSIONAL_SERVICES":
        return <Briefcase className="size-3.5 text-emerald-400" />
      case "DIGITAL_TECH":
        return <Laptop className="size-3.5 text-indigo-400" />
      default:
        return <Sparkles className="size-3.5 text-purple-400" />
    }
  }

  const currentPreset = MULTI_VERTICAL_PRESETS.find((p) => p.id === selectedPresetId)

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Radio className="size-3.5 animate-pulse" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-[.18em] text-indigo-400">
              Gale Bot · High-Intent Social Radar
            </span>
          </div>
          <h1 className="text-[26px] font-black tracking-tight leading-none text-white/95">
            Social Keyword Radar & Lead Discovery
          </h1>
          <p className="text-[13px] text-white/40 mt-1.5 max-w-2xl">
            Find actual people, homeowners, brides, travelers, and business owners actively asking for recommendations across Reddit, local city subreddits, and community forums.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white/70"
            style={card}
          >
            <ShieldCheck className="size-4 text-emerald-400" />
            <span>Universal B2C & Local Service Intent</span>
          </div>
        </div>
      </div>

      {/* Multi-Vertical Preset Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {MULTI_VERTICAL_PRESETS.map((preset) => {
          const isActive = selectedPresetId === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-all hover:brightness-110"
              style={isActive ? activeTabStyle : card}
            >
              {getCategoryIcon(preset.category)}
              <span>{preset.label}</span>
            </button>
          )
        })}
        <button
          onClick={() => setSelectedPresetId("custom")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-white/60 transition-all hover:text-white"
          style={selectedPresetId === "custom" ? activeTabStyle : card}
        >
          <Search className="size-3.5" />
          <span>Custom Keyword</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="rounded-2xl p-4 md:p-5" style={card}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSearch()
          }}
          className="grid grid-cols-1 md:grid-cols-12 gap-3.5"
        >
          <div className="md:col-span-5 relative">
            <Search className="size-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search keyword (e.g. roofing recommendation, wedding photographer, airport ride)..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="md:col-span-3 relative">
            <MapPin className="size-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
              placeholder="City / Subreddit (e.g. AskNYC, chicago, Austin)..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={timeframe}
              onChange={(e: any) => setTimeframe(e.target.value)}
              className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2.5 text-[13px] text-white/80 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="day" className="bg-zinc-900 text-white">Past 24 Hours</option>
              <option value="week" className="bg-zinc-900 text-white">Past Week</option>
              <option value="month" className="bg-zinc-900 text-white">Past Month</option>
              <option value="year" className="bg-zinc-900 text-white">Past Year</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-full min-h-[42px] flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Radio className="size-4" />
                  <span>Scan Radar</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Suggestion Chips & Subreddits */}
        {currentPreset && (
          <div className="space-y-2 mt-3 pt-3 border-t border-white/[0.05]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-white/30 mr-1">Suggested terms:</span>
              {currentPreset.keywords.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => {
                    setQuery(kw)
                    handleSearch(kw, subreddit)
                  }}
                  className={`text-[11.5px] px-2.5 py-1 rounded-lg transition-colors ${
                    query === kw
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-white/[0.03] text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
                  }`}
                >
                  {kw}
                </button>
              ))}
            </div>

            {currentPreset.suggestedSubreddits.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-white/30 mr-1">Target subreddits:</span>
                {currentPreset.suggestedSubreddits.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      setSubreddit(sub)
                      handleSearch(query, sub)
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                      subreddit === sub
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "bg-white/[0.02] text-white/40 hover:text-white/70"
                    }`}
                  >
                    r/{sub}
                  </button>
                ))}
                {subreddit && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubreddit("")
                      handleSearch(query, "")
                    }}
                    className="text-[10.5px] text-rose-400/80 hover:text-rose-300 ml-1 underline"
                  >
                    Clear subreddit
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-black text-white/90">Live Intent Feed</h2>
          {posts.length > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              {posts.length} Opportunities
            </span>
          )}
        </div>
        <span className="text-[11.5px] text-white/30">
          Click &ldquo;Draft Gale Message&rdquo; to generate bespoke 1-to-1 DMs and thread replies
        </span>
      </div>

      {/* Feed Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl" style={card}>
          <Loader2 className="size-8 animate-spin text-indigo-400 mb-3" />
          <p className="text-[14px] font-semibold text-white/70">Scanning public community threads...</p>
          <p className="text-[12px] text-white/30 mt-1">Filtering out spam and analyzing intent requests</p>
        </div>
      ) : posts.length === 0 && searched ? (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl text-center" style={card}>
          <Radio className="size-10 text-white/20 mb-3" />
          <p className="text-[15px] font-bold text-white/80">No active intent posts found for this keyword</p>
          <p className="text-[12.5px] text-white/40 mt-1 max-w-md">
            Try a broader keyword or select another vertical preset above.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const pitch = pitches[post.id]
            const isGenerating = generatingId === post.id
            const isSaved = savedIds.has(post.id)
            const isSaving = savingId === post.id
            const isExpanded = expandedId === post.id

            return (
              <div
                key={post.id}
                className="rounded-2xl p-5 transition-all hover:border-white/[0.12] space-y-4"
                style={card}
              >
                {/* Post Metadata & Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-0.5 rounded-md bg-white/[0.06] text-white/80">
                        {getCategoryIcon(post.intentCategory)}
                        <span>{post.intentCategory.replace(/_/g, " ")}</span>
                      </span>

                      {post.subreddit && (
                        <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {post.subreddit}
                        </span>
                      )}

                      {post.urgency === "HIGH" && (
                        <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <Flame className="size-3" />
                          <span>High Urgency</span>
                        </span>
                      )}

                      <span className="text-[11px] text-white/30 flex items-center gap-1">
                        <Clock className="size-3" />
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>

                    <h3 className="text-[15px] font-bold text-white/95 leading-snug">
                      {post.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white text-[11.5px] font-medium border border-white/[0.06] transition-colors"
                    >
                      <span>View Thread</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>

                {/* Post Body Snippet */}
                <div className="bg-black/30 rounded-xl p-3 border border-white/[0.04]">
                  <p className="text-[12.5px] text-white/60 leading-relaxed">
                    {isExpanded ? post.body : post.body.length > 220 ? `${post.body.slice(0, 220)}...` : post.body}
                  </p>
                  {post.body.length > 220 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : post.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 mt-1"
                    >
                      <span>{isExpanded ? "Show less" : "Read full request"}</span>
                      {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    </button>
                  )}
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-white/[0.04] text-[11px] text-white/35 font-medium">
                    <span>Author: <strong className="text-white/70">{post.author}</strong></span>
                    <span>Engagement: {post.numComments} comments · {post.score} upvotes</span>
                  </div>
                </div>

                {/* Gale Bot AI Outreach Section */}
                {pitch ? (
                  <div className="bg-gradient-to-br from-indigo-950/20 to-purple-950/10 rounded-xl p-4 border border-indigo-500/25 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-indigo-400" />
                        <span className="text-[12px] font-black uppercase tracking-[.14em] text-indigo-300">
                          Gale AI Outreach Response
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {pitch.estimatedFit} Fit
                        </span>
                      </div>

                      {/* Tab switch for DM vs Public Comment */}
                      <div className="flex items-center rounded-lg bg-black/40 p-0.5 border border-white/[0.08]">
                        <button
                          onClick={() =>
                            setPitches((prev) => ({
                              ...prev,
                              [post.id]: { ...prev[post.id], activeTab: "dm" },
                            }))
                          }
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                            pitch.activeTab === "dm"
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-white/40 hover:text-white/80"
                          }`}
                        >
                          Direct Message
                        </button>
                        <button
                          onClick={() =>
                            setPitches((prev) => ({
                              ...prev,
                              [post.id]: { ...prev[post.id], activeTab: "comment" },
                            }))
                          }
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                            pitch.activeTab === "comment"
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-white/40 hover:text-white/80"
                          }`}
                        >
                          Thread Reply
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] text-white/40 italic">
                      Identified Need: <span className="text-white/70 not-italic">{pitch.extractedNeed}</span>
                    </div>

                    {/* Editable Message Box */}
                    <textarea
                      value={pitch.activeTab === "dm" ? pitch.dmMessage : pitch.publicComment}
                      onChange={(e) => {
                        const val = e.target.value
                        setPitches((prev) => ({
                          ...prev,
                          [post.id]: {
                            ...prev[post.id],
                            ...(pitch.activeTab === "dm" ? { dmMessage: val } : { publicComment: val }),
                          },
                        }))
                      }}
                      rows={3}
                      className="w-full bg-black/50 border border-indigo-500/20 rounded-xl p-3 text-[12.5px] text-white/90 leading-relaxed focus:outline-none focus:border-indigo-400"
                    />

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            copyText(
                              post.id,
                              pitch.activeTab === "dm" ? pitch.dmMessage : pitch.publicComment
                            )
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-[12px] font-bold transition-colors"
                        >
                          {copiedId === post.id ? (
                            <>
                              <Check className="size-3.5 text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="size-3.5" />
                              <span>Copy Message</span>
                            </>
                          )}
                        </button>

                        <a
                          href={post.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[12px] font-bold transition-colors"
                        >
                          <Send className="size-3.5" />
                          <span>Go to Thread to Send</span>
                        </a>
                      </div>

                      <button
                        onClick={() => handleSaveLead(post)}
                        disabled={isSaving || isSaved}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
                          isSaved
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-white/[0.04] hover:bg-white/[0.09] text-white/80 hover:text-white border border-white/[0.08]"
                        }`}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : isSaved ? (
                          <>
                            <Check className="size-3.5" />
                            <span>Saved in Gale Pipeline</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="size-3.5" />
                            <span>Save to Pipeline</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleGeneratePitch(post)}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 border border-indigo-500/30 text-[12.5px] font-bold transition-all shadow-sm"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin text-indigo-400" />
                          <span>Gale AI is analyzing & drafting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5 text-indigo-400" />
                          <span>Draft Gale Message</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleSaveLead(post)}
                      disabled={isSaving || isSaved}
                      className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white/40 hover:text-white/80 transition-colors"
                    >
                      <BookmarkPlus className="size-3.5" />
                      <span>{isSaved ? "Saved" : "Save lead directly"}</span>
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
