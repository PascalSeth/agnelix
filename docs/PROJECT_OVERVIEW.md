# Galien — Complete Project Overview

> **Purpose:** Single reference document for AI-assisted research, product strategy, and feature exploration.  
> **Product name:** Galien (repo folder: `leadgenz`)  
> **Tagline:** Your AI Sales Concierge — find prospects, write emails, book meetings.

---

## 1. What Galien Is

Galien is an **AI-powered outbound sales platform** aimed at people who sell to **local businesses** (dentists, plumbers, salons, hotels, trades, etc.). It combines:

- **Lead discovery** (Google Maps / Places search by niche + city)
- **Research & enrichment** (website scraping, audits, contact finding, LinkedIn)
- **AI-written cold email sequences** (personalised from real business context)
- **Campaign execution** (multi-step sequences via your SMTP/Gmail)
- **Reply handling** (IMAP sync, intent classification, battle cards, draft replies)
- **Autonomous agent** (auto-send with review windows, meeting booking, proposals, nurture)
- **Pipeline CRM** (kanban stages, deal values, revenue attribution)

Everything above is **built into Galien** — not bolted on from a separate SaaS stack. The product is a single app from search → send → reply → pipeline → meetings.

### Standalone product (no third-party tool stack)

Galien does **not** integrate with, depend on, or replace specific tools like HubSpot, Instantly, AgencyAnalytics, ClickUp, SuiteDash, or similar “agency stack” products. Those are irrelevant to how the product actually runs.

| Typical agency stack (others) | What Galien uses instead (native) |
|------------------------------|-------------------------------------|
| Outreach sequencer (e.g. Instantly) | Built-in sequences + campaigns + SMTP send |
| CRM (e.g. HubSpot) | Built-in pipeline, lead records, deal values |
| Reporting dashboards (e.g. AgencyAnalytics) | Dashboard KPIs, campaign stats, open/click tracking, revenue from won deals |
| PM / client portal tools | Not part of scope — outreach + sales pipeline only |
| Lead databases / list vendors | Google Places search + on-site enrichment |

**What you actually need to run it:**

- Google account (sign-in + optional Maps API key)
- Your email inbox (SMTP + IMAP / Gmail App Password)
- DeepSeek API key (AI)
- PostgreSQL database

No mandatory CRM, sequencer, or reporting SaaS. The in-app workflow (Find Leads → Campaigns → Inbox → Pipeline → Dashboard) is the full loop and it works as one system.

**Note on agency market research:** Charts about agency profit margins, manual reporting hours, retention rates, or “$205/mo tool stack” costs describe **industry pain** for the ICP (marketing agencies), not Galien architecture or integrations. Do not assume Galien uses or competes feature-by-feature with those products — it is an all-in-one outbound engine for booking meetings with local businesses.

### Core value proposition (landing page)

| Problem | Galien solution |
|--------|------------------|
| Hours scraping Maps, buying lists, guessing emails | Find local businesses by niche/city; extract verified contact info |
| Generic templates → spam / ignored | AI reads their website and writes human, specific outreach |
| Slow replies → cold leads | AI reads inbound replies, handles objections, books meetings |

### Who it's for

1. **Digital marketing agencies** — find dentists, roofers, salons; personalised outreach; auto follow-up  
2. **B2B service providers** — website research, AI sequences, pipeline CRM  
3. **Consultants & freelancers** — autopilot mode, battle cards, meeting booking as an “AI SDR”

---

## 2. UK Market Focus

Galien is **not UK-only**, but the product and demos are heavily tuned for **UK local B2B**:

- **Playground demo** uses Apex Dental Practice in **Leeds** (`apexdental.co.uk`, LS1 postcode, +44 phone)
- **AI email personas** in tests/scripts target “UK business owners” with UK trades examples (plumbing in Leeds, `.co.uk` domains)
- **Pricing in demos** uses **£** (e.g. £1,200 setup + £350/mo for dental web/marketing)
- **Research** uses `Accept-Language: en-GB` when scraping websites
- **Landing examples** mix US cities (Austin, Miami, Dallas) and UK (Leeds) — product is **geo-agnostic** via “business type + city” search

**Ideal UK use cases:** agencies selling web, SEO, PPC, design, or IT to local SMEs; trades marketing; dental/chiropractic practice growth; hospitality (boutique hotels).

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 19 |
| Language | TypeScript |
| Database | PostgreSQL via Prisma 7 |
| Auth | NextAuth v5 (Google sign-in) |
| AI | DeepSeek API (`deepseek-v4-flash`) via OpenAI SDK |
| Email send | Nodemailer + user SMTP (Gmail App Password supported) |
| Email receive | IMAP (`imapflow`) — inbox sync for replies |
| Maps / leads | Google Places API (Text Search) |
| Web research | Cheerio scraping, Google Custom Search API |
| Hosting | Netlify (scheduled functions for cron jobs) |
| Analytics | PostHog |
| UI | Tailwind CSS 4, Radix/shadcn components |

---

## 4. Application Structure

### Public / marketing

| Route | Description |
|-------|-------------|
| `/` | Landing page (hero, problem/solution, how it works, features bento, pricing, verticals, CTA) |
| `/sign-in` | Google OAuth sign-in |

### Onboarding

| Route | Description |
|-------|-------------|
| `/onboarding` | First-run setup: agency name, title, company description, tone, logo, calendar link |

After onboarding, user is redirected to **Sequences** to create their first email sequence.

### Dashboard (authenticated)

| Route | Nav label | Purpose |
|-------|-----------|---------|
| `/dashboard` | Dashboard | KPIs, campaigns grid, activity feed, setup checklist, agent digest |
| `/pipeline` | Pipeline | Kanban CRM — drag leads across stages; deal values |
| `/inbox` | Inbox | Reply inbox + AI Queue (pending autonomous actions) |
| `/playground` | Playground | Interactive demo (mock UK dental scenario, no live data) |
| `/sequences` | Sequences | Multi-step email sequence builder + AI step copilot |
| `/campaigns` | Campaigns | Campaign list and management |
| `/campaigns/new` | — | Create campaign (name, sequence, leads) |
| `/campaigns/[id]` | — | Campaign detail: leads, workflow bar, autopilot, drafts |
| `/campaigns/[id]/preview` | — | Email preview before send |
| `/leads` | Leads | Lead list |
| `/leads/find` | — | **Find Leads** — Google Maps search, audit, enrich, add to campaign |
| `/leads/upload` | — | CSV upload |
| `/leads/[id]` | — | Lead detail: thread, analysis, edit, activities |
| `/settings/agency` | Settings | Agency profile, SMTP, logo, calendar link |
| `/settings/autopilot` | — | Auto-search schedules + agent goals (not in sidebar; linked from settings flows) |

### Global dashboard UI

- **Sidebar** — navigation groups: Overview (Dashboard, Pipeline, Inbox, Playground) + Outreach (Sequences, Campaigns, Leads) + Settings  
- **AI Advisor bubble (“Galien”)** — floating chat on all dashboard pages; opens via bubble or `open-ai-advisor` event (Playground uses this)

---

## 5. Feature Deep Dive

### 5.1 Dashboard

**Metrics displayed:**

- Active campaigns, total leads, emails sent, reply rate, meetings booked, closed revenue  
- Getting-started checklist (sequence → campaign → leads)  
- Action cards: replies waiting (Inbox), hot leads (Pipeline)  
- **Agent digest** banner: daily autonomous actions, meetings, proposals, flagged high-risk pending actions  
- Revenue attribution from **WON** deals with `dealValue` set in Pipeline  
- Recent email activity feed (status: SENT, OPENED, CLICKED, REPLIED, BOUNCED)

### 5.2 Find Leads (`/leads/find`)

Primary **lead discovery** workflow:

1. User enters **business type** (e.g. “dental practice”) and **location** (e.g. “Leeds, UK”)  
2. **Google Places Text Search** returns businesses with name, address, website, phone, rating, reviews  
3. Per-lead enrichment (on inspect/select):
   - **Site audit** — SSL, speed, mobile, analytics, tracking pixel  
   - **Contact finder** — scrape site for emails and decision-maker names  
   - **LinkedIn search** — decision-maker profiles (cached per domain)  
   - **Company research** — AI dossier from website + Google snippets  
   - **Icebreaker** — AI hook sentence from audit + research  
   - **AI lead scoring / category** (shown in UI panels)  
4. Bulk select → add to **existing campaign** or create new campaign with chosen **sequence**

**Auto-search (Autopilot):** same query+location can run on a **daily/weekly cron**, auto-importing new Places results into a linked campaign and triggering email generation.

### 5.3 Sequences

- Multi-step **email sequences** with per-step **delay days**  
- Optional subject/body templates per step; AI generates personalised content per lead at send time  
- **Galien Step Copilot** — AI helps write/refine sequence step guidelines  
- Default sequence created during onboarding path  
- Sequences linked to campaigns and auto-searches

**Typical sequence:** 3–4 steps over ~14 days (intro → follow-up → value add → break-up), as shown in Playground nurture track (Day 7, 21, 45, 90).

### 5.4 Campaigns

**Campaign states:** `DRAFT` → `ACTIVE` → `PAUSED` → `COMPLETED`

**Workflow phases** (computed from leads + emails):

| Phase | Meaning |
|-------|---------|
| `no-leads` | Need leads from Find or CSV |
| `enriching` | NEW leads missing contact JSON |
| `ready` | Ready to launch / generate |
| `generating` | AI writing drafts |
| `sending` | Emails queued/sending via SMTP |
| `review` | Manual review of drafts (non-autonomous mode) |
| `live` | Active outreach + scheduled follow-ups |
| `paused` | Campaign paused |

**Campaign capabilities:**

- Attach sequence + enrolled leads  
- **Autonomous mode** (`autonomous: true`) — auto-send drafts without manual approval where policy allows  
- Generate all drafts / queue all leads  
- Per-lead draft generation and queue  
- Stats: sent, opened, clicked, replies, meetings  
- Campaign activities log  
- Email open/click tracking via tracking pixels and link redirects

### 5.5 Pipeline (CRM)

**Kanban columns:**

`NEW` → `CONTACTED` → `REPLIED` → `INTERESTED` → `MEETING_BOOKED` → `PROPOSAL_SENT` → `WON` / `LOST`

Also supported in data model: `NOT_INTERESTED`, `BOUNCED`

- Drag-and-drop stage updates  
- **Deal value** per lead for revenue reporting  
- Links to lead detail pages

### 5.6 Inbox

Two tabs:

#### Replies

- IMAP sync pulls inbound messages matched to leads  
- Full **conversation thread** (sent steps + received replies)  
- **Stage dropdown** on conversation  
- **AI draft generation** with styles: Soft, Direct, Value-First  
- Manual send via SMTP  
- **AI Copilot side panel** with **Battle Card** when available

#### AI Queue (pending actions)

Autonomous agent queues actions for review before auto-execution:

| Action type | Description |
|-------------|-------------|
| `SEND_REPLY` | Send AI-drafted reply |
| `BOOK_MEETING` | Reply proposing/confirming meeting (+ calendar link) |
| `SEND_PROPOSAL` | Send generated proposal |
| `ENROLL_NURTURE` | Enroll in nurture sequence |
| `UPDATE_STAGE` | Move pipeline stage |

Each pending action has:

- **Intent** (INTERESTED, QUESTION, OBJECTION, NOT_NOW, OOO)  
- **Risk level** (LOW / HIGH) and **confidence** (LOW / MEDIUM / HIGH)  
- **Review countdown** — auto-sends when timer expires if policy allows  
- Approve / Dismiss / Edit draft  
- Metadata: “why this draft”, next best action

**Sync behavior:** manual sync button, silent IMAP sync every 15s, DB poll every 3s.

### 5.7 Battle Cards

Generated when a prospect replies (especially INTERESTED / OBJECTION). JSON stored on `Lead.battleCard`:

- **Summary** — situational read on the prospect  
- **Talking points** — specific hooks from audit/research  
- **Likely objections** + counters  
- **Suggested next step**  
- **Urgency angle**

Shown in Inbox Copilot, lead detail, and Playground demos.

### 5.8 Playground

**Not live data** — interactive **storyboard** of the full outreach loop:

**Mock lead:** James Mitchell, Apex Dental Practice, Leeds UK

**Four scenarios:**

1. **Interested → Meeting** — Maps find → audit → email → reply → AI draft → meeting booked  
2. **Objection → Handled** — existing vendor objection → counter → pipeline REPLIED  
3. **Rejection → Nurtured** — unsubscribe → sequences stopped → 60-day nurture  
4. **Full Journey → Won** — proposal request → auto proposal → deal won (£1,200 + £350/mo)

Split UI: **Your view (inside Galien)** vs **Prospect’s view (Gmail)**. Auto-play mode. Promotes **Ask Galien** AI advisor.

### 5.9 AI Advisor (“Galien”)

- Floating bubble on all dashboard pages (`AiAdvisorBubble`)  
- Chat with **Galien** — B2B sales coach using user’s agency profile as context  
- API: `/api/ai-advisor` (GET greeting, POST chat)  
- Use cases: campaign strategy, ICP targeting, outreach hooks, growth advice  
- Model: DeepSeek; concise, max ~3 short paragraphs

### 5.10 Autopilot & Agent Goals (`/settings/autopilot`)

**Auto-search rules:**

- Query + location + sequence + campaign (existing or new)  
- Frequency: daily / weekly  
- Cron imports new Places results and can trigger campaign email pipeline

**Agent goals** (`AgentGoal` model):

| Setting | Default | Purpose |
|---------|---------|---------|
| `meetingsPerMonth` | 5 | Target |
| `replyRateTarget` | 8% | Target |
| `dailyLeadCap` | 40 | Lead import cap |
| `autoSendEnabled` | true | Allow autonomous sends |
| `reviewWindowMins` | 5 | Time to review before auto-send |
| `maxAutoSendsPerDay` | 12 | Daily auto-send cap |
| `minConfidence` | MEDIUM | Min AI confidence for auto-send |

**Risk policy** (`evaluateRiskPolicy`):

Auto-send only if: auto-send enabled, confidence ≥ threshold, under daily cap, no unsubscribe keywords in reply.

**Agent memory** — stores intent, style, outcome, won/booked flags for learning over time.

**Daily digest email** — summary of agent actions (sent, meetings, proposals, flagged).

### 5.11 Settings (`/settings/agency`)

- Agency name, logo upload  
- User title, company description, **tone** (Professional, Friendly, Direct, Consultative)  
- **SMTP** host/port/credentials (Gmail App Password documented in UI)  
- `fromEmail`, calendar link (for meeting booking in replies)  
- SMTP test endpoint  
- **AI refine** — polish company description from rough notes

### 5.12 Lead Detail (`/leads/[id]`)

- Contact info, company, industry, website, LinkedIn  
- Audit JSON, contacts JSON, LinkedIn profiles JSON  
- Recommended approach, pain points, recent news, notes  
- Email thread and activities  
- Deal value, battle card  
- Stage updates, place/Google data  
- Lead edit panel, analysis panel

### 5.13 CSV Upload (`/leads/upload`)

Import leads via PapaParse; map columns to lead fields; bulk add to pipeline/campaigns.

---

## 6. AI Capabilities Summary

| Capability | Where used |
|------------|------------|
| Cold email generation (multi-step) | Campaign send, sequence steps |
| Reply intent classification | Inbound reply processing |
| Reply draft generation | Inbox, pending actions |
| Battle card generation | On reply |
| Proposal generation | INTERESTED + proposal request |
| Icebreaker / opener lines | Find Leads, enrichment |
| Company research dossier | Lead enrich, research API |
| Site-audit-based hooks | Email personalisation |
| Sequence step copilot | Sequences page |
| Company description refine | Settings |
| Conversational advisor | Galien bubble |
| Lead scoring / categorisation | Find Leads UI (Tier 1, healthcare, etc.) |

**AI provider:** DeepSeek (`NEXT_DEEPSEEKER_API_KEY`), model `deepseek-v4-flash`.

**Email persona:** Trained/prompted as senior B2B sales professional; UK-local business context in many prompts.

---

## 7. Email & Tracking

**Sending:**

- User’s SMTP (typically Gmail + App Password)  
- HTML emails with optional agency logo  
- Open tracking pixel (`/api/track/open`)  
- Click tracking redirect (`/api/track/click`)  
- “Sent via Galien” footer

**Receiving:**

- IMAP sync matches replies to leads/emails  
- Cron: `/api/cron/replies`  
- Updates lead status, triggers classification + agent pipeline

**Sequence scheduler:**

- Cron processes queued emails on delay schedule (`/api/cron/sequences`, `process-queue`)

---

## 8. Data Model (Core Entities)

```
User
  ├── campaigns, leads, sequences, autoSearches
  ├── agentGoal, agentMemories, digestLogs
  └── pendingActions

Lead
  ├── status (pipeline enum)
  ├── dealValue, battleCard
  ├── auditJson, contactsJson, linkedinProfilesJson
  └── emails, replies, activities, campaignLeads

Campaign
  ├── status, autonomous flag
  ├── sequenceId, stats counters
  └── campaignLeads, emails, autoSearches

Sequence → SequenceStep (stepNumber, delayDays, templates)

Email
  ├── status (DRAFT → QUEUED → SENT → OPENED/CLICKED/REPLIED…)
  ├── stepNumber, campaignId, tracking events

Reply → linked to lead + optional original email

PendingAction
  ├── type, intent, draft, risk, confidence, expiresAt, status

AutoSearch
  ├── query, location, frequency, sequence, campaign link

Activity (EMAIL_SENT, REPLY_RECEIVED, STAGE_CHANGED, MEETING_BOOKED, …)

DomainContactCache (per-domain contact/LinkedIn cache)
```

---

## 9. Background Jobs (Cron / Netlify Functions)

| Job | Purpose |
|-----|---------|
| `cron-leads` | Run auto-searches, import Places leads |
| `cron-sequences` | Send scheduled sequence emails |
| `cron-replies` | IMAP reply sync + agent trigger |
| `cron-agent` | Execute expired pending actions (auto-send) |
| `cron-agent-digest` | Daily digest emails to users |

---

## 10. Landing Page Pricing (Marketing — may differ from billing implementation)

| Tier | Price | Credits | Seats | Highlights |
|------|-------|---------|-------|------------|
| Starter | $97/mo | 500 | 1 | Email only, 1 vertical playbook, basic discovery |
| Growth | $297/mo | 2,500 | 5 | Email + LinkedIn, 3 playbooks, A/B subjects |
| Agency | $997/mo | 15,000 | Unlimited | + SMS, AI reply handling, white-label, multi-client |
| Enterprise | $2,997+ | Unlimited | Unlimited | API, custom AI training, dedicated AM |

Performance-based / Calendly integrations mentioned as add-ons on landing.

---

## 11. End-to-End User Journey

```
Sign in (Google)
    → Onboarding (agency profile, tone, calendar)
    → Create sequence (or use default)
    → Find Leads (Maps) OR upload CSV
    → Create campaign, enroll leads
    → Launch: enrich → AI drafts → send (manual or autonomous)
    → Opens/clicks tracked
    → Replies sync to Inbox
    → AI classifies → battle card → pending action OR manual reply
    → Pipeline updated (REPLIED → INTERESTED → MEETING_BOOKED → WON)
    → Dashboard shows meetings + revenue
```

**Autopilot path:** configure auto-search + agent goals → daily new leads + emails with minimal manual steps.

---

## 12. Key Differentiators (for research)

1. **All-in-one, not a stack** — lead find, enrich, email, inbox, AI agent, and CRM live in one app; no required HubSpot/Instantly/reporting tools  
2. **Local business focus** — Maps-first discovery, not generic B2B databases  
3. **Website-native personalisation** — audits and scraping feed email copy, not mail-merge fields  
4. **Closed loop** — discovery → send → reply → book meeting in one product  
5. **Human-in-the-loop autonomy** — review window + risk policy before auto-send  
6. **Battle cards** — sales enablement at reply time, not just email automation  
7. **UK-friendly demos** — trades, dental, Leeds examples; £ pricing in scenarios  
8. **Agency ICP** — sells to agencies/consultants, but product scope is outbound sales automation (not client reporting, PM, or portals)

---

## 13. Environment Variables (Reference)

| Variable | Role |
|----------|------|
| `DATABASE_URL` | PostgreSQL |
| `NEXTAUTH_*` / Google OAuth | Auth |
| `NEXT_DEEPSEEKER_API_KEY` | AI |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Places search |
| `GOOGLE_SEARCH_API_KEY`, `GOOGLE_SEARCH_CX` | Company research |
| User SMTP fields in DB | Email send (per user) |

---

## 14. Glossary

| Term | Meaning |
|------|---------|
| **Galien** | Product brand |
| **Galien** | In-app AI business advisor (chat bubble) |
| **Battle card** | AI-generated reply strategy sheet |
| **Autonomous / Autopilot** | Campaign or agent mode with auto-send |
| **AI Queue** | Pending actions awaiting approve/auto-send |
| **Auto-search** | Scheduled Maps query → lead import |
| **Sequence** | Multi-step timed email outreach |
| **Campaign** | Container linking sequence + enrolled leads + stats |
| **Place** | Google Maps business result |
| **Nurture** | Long-term re-engagement track after rejection/delay |

---

*Document generated from codebase and landing page content. Last updated: June 2026.*
