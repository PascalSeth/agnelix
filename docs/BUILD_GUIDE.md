# Agnelix — Complete Build Guide
> Simple, categorized reference for everything needed to build the platform.
> Based on the official business plan v1.0 (May 2026).

---

## TABLE OF CONTENTS

1. [What We Are Building](#1-what-we-are-building)
2. [The 6 Core Modules](#2-the-6-core-modules)
3. [Pages & Screens to Build](#3-pages--screens-to-build)
4. [Tech Stack — Every Tool Chosen](#4-tech-stack--every-tool-chosen)
5. [External APIs & Services](#5-external-apis--services)
6. [Database — Tables & Fields](#6-database--tables--fields)
7. [Backend — API Routes to Build](#7-backend--api-routes-to-build)
8. [Frontend — Components to Build](#8-frontend--components-to-build)
9. [AI Functions](#9-ai-functions)
10. [Email & Outreach Functions](#10-email--outreach-functions)
11. [Compliance Functions](#11-compliance-functions)
12. [Billing & Pricing Logic](#12-billing--pricing-logic)
13. [Agency & Multi-Tenant Logic](#13-agency--multi-tenant-logic)
14. [Build Order — What to Build First](#14-build-order--what-to-build-first)
15. [Environment Variables Needed](#15-environment-variables-needed)
16. [Pricing Tiers Summary](#16-pricing-tiers-summary)
17. [Key Numbers to Know](#17-key-numbers-to-know)

---

## 1. WHAT WE ARE BUILDING

Agnelix is a SaaS platform that does 5 things automatically for marketing agencies:

| Step | What Happens |
|---|---|
| 1. Find | Scans the internet for businesses that are likely to buy right now |
| 2. Score | Gives each business a score (0-100) based on how ready they are to buy |
| 3. Message | AI writes and sends personalized emails/LinkedIn messages to those businesses |
| 4. Reply | AI reads replies and responds — books meetings, handles objections, unsubscribes |
| 5. Prove | Shows the agency exactly how much money came from each lead |

**Primary Customer:** Digital marketing agencies that serve local businesses (dentists, roofers, chiropractors, restaurants).

**How we make money:**
- Monthly subscription ($97 / $297 / $997 / $2,997)
- Pay-per-meeting fee ($150–$500 per qualified meeting booked)
- Revenue share (5–10% of deals we help close)

---

## 2. THE 6 CORE MODULES

These are the six engines that power the whole product. Everything else is UI around these.

---

### MODULE 1 — Signal Intelligence Engine
**What it does:** Constantly watches the internet for businesses showing "buying signals."

**A buying signal is any of these:**
- A business posted a job listing (they're growing = they need marketing)
- A business got bad Google reviews recently (reputation problem = they need help)
- A business just opened or expanded (new location = they need leads)
- A business changed their website tech stack (tech change = open to new tools)
- A business dropped in Google search rankings (SEO problem = they need an agency)

**Data sources to scan:**
| Source | What We Get From It | API/Method |
|---|---|---|
| Google Business Profile | Reviews, ratings, claims status | Google Places API |
| Indeed / LinkedIn Jobs | Hiring signals | Indeed Publisher API, LinkedIn Jobs API |
| BuiltWith / Wappalyzer | What tech a website uses | BuiltWith API |
| Google Search | SEO ranking drops | SEMrush API or DataForSEO |
| Company websites | New locations, press releases | Web scraping (Cheerio/Playwright) |

**How the score is calculated:**
```
Intent Score = Signal Strength × Recency × Fit Score × Timing Multiplier

Signal Strength:  1–10  (funding round = 10, job posting = 5, bad review = 7)
Recency:          1.0 today → 0.5 at 30 days → 0.1 at 90 days
Fit Score:        Does the business match the agency's target customer?
Timing Multiplier: Is this a busy season for this industry?
```

**Functions needed:**
- `scanGoogleReviews(businessId)` — fetch recent reviews, detect sentiment drop
- `scanJobPostings(keyword, location)` — find businesses hiring in a niche
- `scanTechStack(domain)` — detect what tools a website uses
- `scanSeoRankings(domain)` — detect ranking drops
- `calculateIntentScore(signals[])` — run the formula above, return 0–100
- `runSignalScan(organizationId)` — scheduled job that runs all scans for an org

---

### MODULE 2 — Predictive Scoring Engine
**What it does:** Takes raw signal data and predicts which leads are most likely to buy and when.

**Output for each lead:**
- A score from 0–100
- A buying window ("High probability in next 30 days")
- A recommended action ("Send case study email Tuesday 10am")
- A confidence level ("85% confident")

**Functions needed:**
- `scoreLeadBySignals(lead, signals[])` — apply scoring formula
- `predictBuyingWindow(lead)` — estimate timeframe for conversion
- `recommendNextAction(lead)` — suggest what to do next
- `rankLeadList(leads[])` — sort leads by score descending
- `refreshLeadScores(organizationId)` — recalculate all scores daily

---

### MODULE 3 — AI Outreach Automation
**What it does:** Writes and sends personalized messages, then reads and responds to replies — all automatically.

**Channels supported:**
- Email (primary — always available)
- LinkedIn (Growth tier and above)
- SMS (Agency tier and above, opt-in only)

**A sequence (campaign) looks like this:**
```
Day 1  → Personalized intro email (AI writes the icebreaker from the signal)
Day 3  → LinkedIn connection request with a personal note
Day 5  → Value-add email (case study relevant to their situation)
Day 7  → SMS follow-up (if opted in)
Day 10 → "Breakup" email with soft call to action
Day 14 → Re-engagement from a new angle
```

**When someone replies, the AI classifies it:**
| Reply Type | Example | What AI Does |
|---|---|---|
| Interested | "Tell me more" | Books a meeting via Calendly |
| Question | "How much does it cost?" | Answers using the knowledge base |
| Objection | "We have a vendor" | Uses counter-objection playbook |
| Not Interested | "Remove me" | Unsubscribes + logs compliance |
| Out of Office | "I'm on vacation until..." | Pauses sequence, resumes when they're back |
| Unclear | Anything else | Flags for human review |

**Functions needed:**
- `generateOutreachEmail(lead, signal, brandVoice)` — AI writes a personalized email
- `generateLinkedInNote(lead, signal)` — AI writes a connection request note
- `classifyReply(emailBody)` — AI reads a reply and labels it (interested/objection/etc.)
- `generateAIResponse(replyClass, lead, context)` — AI writes the response
- `bookMeeting(lead, calendarLink)` — sends Calendly link, confirms booking
- `sendEmailSequenceStep(sequenceId, leadId, stepNumber)` — sends one step of the sequence
- `pauseSequence(leadId, reason)` — pause for OOO or unsubscribe
- `resumeSequence(leadId)` — resume a paused sequence
- `createCampaign(orgId, settings)` — set up a new outreach campaign
- `launchCampaign(campaignId)` — start sending

---

### MODULE 4 — Revenue Attribution & Analytics
**What it does:** Tracks every lead from the moment it was discovered all the way to a closed deal, so the agency can show their clients "you spent $297 and made $12,400."

**How credit is split across touchpoints:**
- First touch (when we found the lead): 30% credit
- Key touch (when the meeting was booked): 40% credit
- Last touch (when the deal closed): 30% credit

**Dashboard metrics to display:**
| Metric | What It Shows |
|---|---|
| Leads Found | Total discovered this period |
| Emails Sent | Total outreach sent |
| Open Rate | % of emails opened |
| Reply Rate | % that replied |
| Meetings Booked | Qualified meetings scheduled |
| Proposals Sent | Quotes/proposals sent after meeting |
| Deals Closed | Revenue won |
| ROI | Revenue ÷ subscription cost |

**Reports to generate:**
- Weekly: "This week: X leads found, X emails sent, X meetings booked"
- Monthly: "ROI Report: $297 spent → $8,500 revenue (28x ROI)"
- Quarterly: "Best leads come from hiring signals + review monitoring"

**Functions needed:**
- `trackEvent(leadId, eventType, channel, metadata)` — log every interaction
- `calculateROI(organizationId, period)` — compute revenue vs cost
- `generateWeeklyReport(organizationId)` — build weekly summary
- `generateMonthlyROIReport(organizationId)` — build ROI report
- `getSourcePerformance(organizationId)` — which signal sources produce best leads
- `getFunnelMetrics(organizationId)` — leads → MQLs → SQLs → meetings → deals
- `getCohortAnalysis(organizationId)` — compare lead batches over time

---

### MODULE 5 — Compliance Engine
**What it does:** Makes sure every email, SMS, and data collection follows the law automatically. Covers GDPR (EU), CCPA (California), CAN-SPAM (US email), TCPA (US SMS).

**Compliance Score per lead (0–100):**
| Factor | Points |
|---|---|
| Consent status confirmed | 40 pts |
| Data is accurate and verified | 20 pts |
| Jurisdiction risk is low | 20 pts |
| Communication history is clean | 20 pts |

Leads below 70 points are **quarantined** and cannot be contacted until resolved.

**Functions needed:**
- `detectJurisdiction(lead)` — figure out if lead is in EU, California, or elsewhere
- `checkConsentStatus(leadId)` — is there valid consent to contact?
- `calculateComplianceScore(leadId)` — run the 0–100 formula
- `quarantineLead(leadId, reason)` — block lead from being contacted
- `processUnsubscribe(email, channel)` — immediately remove from all lists
- `scrubDNCList(phoneNumbers[])` — check against Do-Not-Call registry
- `autoDeleteExpiredData(retentionDays)` — delete leads older than policy
- `generateComplianceReport(organizationId)` — export for regulators
- `addUnsubscribeLinkToEmail(emailBody)` — inject required unsubscribe footer
- `enforceQuietHours(leadId, channel)` — no SMS outside 8am–9pm local time

---

### MODULE 6 — Agency Management Layer
**What it does:** Lets an agency manage multiple client accounts from one dashboard. Each client's data is completely separate.

**Features:**
- Each client (sub-account) has their own leads, campaigns, and reports
- Agency owner can see all clients at once ("cross-client dashboard")
- White-label: agency can put their own logo and domain on the platform
- Role-based access: Admin, Manager, Sales Rep, Viewer
- Agency can auto-invoice their clients based on usage

**Functions needed:**
- `createSubAccount(organizationId, clientName)` — add a new client under the agency
- `getAgencyDashboard(organizationId)` — aggregated stats across all clients
- `setCrossClientPermissions(userId, role)` — control who sees what
- `applyWhiteLabel(organizationId, branding)` — set custom logo/domain/colors
- `generateClientInvoice(subAccountId, period)` — auto-bill the client
- `shareTemplate(templateId, targetOrgIds[])` — share a winning email template across clients
- `getLeaderboard(organizationId)` — show which sales rep is performing best

---

## 3. PAGES & SCREENS TO BUILD

### Public Pages (No login required)
| Page | Route | Purpose |
|---|---|---|
| Landing Page | `/` | Marketing, sign up, demo CTA |
| Pricing Page | `/pricing` | Show all 4 tiers |
| Features Page | `/features` | Explain each module |
| Login | `/login` | Email + password login |
| Register | `/register` | Sign up, choose plan |
| Forgot Password | `/forgot-password` | Reset flow |

### App Pages (Login required)
| Page | Route | Purpose |
|---|---|---|
| Dashboard / Home | `/dashboard` | Overview of all KPIs |
| Find Leads | `/dashboard/leads` | Search, filter, browse leads |
| Lead Detail | `/dashboard/leads/[id]` | Full profile, signals, history |
| Campaigns | `/dashboard/campaigns` | List of all outreach campaigns |
| Campaign Builder | `/dashboard/campaigns/new` | Create a new campaign |
| Campaign Detail | `/dashboard/campaigns/[id]` | Stats, sequences, replies |
| AI Assistants | `/dashboard/assistants` | Manage AI personas/brand voices |
| Live Alerts | `/dashboard/alerts` | Real-time signal feed |
| Reports | `/dashboard/reports` | Analytics, ROI reports |
| Team | `/dashboard/team` | Add/remove users, set roles |
| Settings | `/dashboard/settings` | Account, billing, integrations |
| Client Accounts | `/dashboard/clients` | Agency: manage sub-accounts |
| Client Detail | `/dashboard/clients/[id]` | One client's full dashboard |
| Billing | `/dashboard/billing` | Plan, usage, invoices |
| Onboarding | `/onboarding` | Step-by-step setup wizard |

---

## 4. TECH STACK — EVERY TOOL CHOSEN

### Frontend (what users see)
| Tool | What It Does | Why |
|---|---|---|
| Next.js 16 | Main framework | Already in project, SSR, fast |
| React 19 | UI components | Already in project |
| Tailwind CSS v4 | Styling | Already in project |
| Zustand | State management | Simple, lightweight, no boilerplate |
| React Hook Form | Form handling | Best DX, works with Zod |
| Zod | Form/data validation | Type-safe, pairs with RHF |
| Recharts | Charts and graphs | Simple, React-native |
| Lucide React | Icons | Already in project |
| clsx + tailwind-merge | Class utilities | Already in project |
| TanStack Query | Data fetching/caching | Server state management |

### Backend (server-side logic)
| Tool | What It Does | Why |
|---|---|---|
| Next.js API Routes | API endpoints | Already in project, no extra server |
| Prisma | Database ORM | Type-safe, great DX with PostgreSQL |
| PostgreSQL | Main database | ACID compliant, handles everything |
| Redis | Caching + job queue | Session cache, rate limiting |
| Bull (BullMQ) | Background jobs | Schedule scans, send emails async |

### AI & Intelligence
| Tool | What It Does | Why |
|---|---|---|
| Claude API (Anthropic) | Write emails, classify replies, score leads | Best-in-class text generation |
| OpenAI API (optional) | Fallback or embeddings | Backup, also good for embeddings |

### Auth & Users
| Tool | What It Does | Why |
|---|---|---|
| Supabase Auth | User login, sessions, OAuth | Pairs perfectly with PostgreSQL |
| NextAuth.js (alt) | Alternative auth option | If not using Supabase |

### Email Sending
| Tool | What It Does | Why |
|---|---|---|
| SendGrid | Transactional emails | High deliverability, tracking |
| Amazon SES | Bulk sending backup | Cheaper at volume |
| Resend (alternative) | Simpler dev experience | Great API, Next.js friendly |

### Payments
| Tool | What It Does | Why |
|---|---|---|
| Stripe | Subscriptions, invoices, billing | Industry standard for SaaS |

### Scheduling / Meetings
| Tool | What It Does | Why |
|---|---|---|
| Calendly API | Book meetings from AI replies | Customers already use it |
| Google Calendar API | Alternative booking | Broader compatibility |

### Infrastructure
| Tool | What It Does | Why |
|---|---|---|
| Vercel | Deploy Next.js frontend | Easiest, built for Next.js |
| Railway or Render | Deploy PostgreSQL + Redis | Simple managed databases |
| AWS S3 or Cloudflare R2 | File storage (reports, exports) | Cheap, reliable |
| Upstash | Serverless Redis | Works well with Vercel |

### Monitoring & Ops
| Tool | What It Does | Why |
|---|---|---|
| Sentry | Error tracking | Catch bugs in production |
| PostHog | Product analytics | Track feature usage, funnels |
| Resend / Loops | Marketing email | Onboarding sequences for users |

---

## 5. EXTERNAL APIS & SERVICES

### Lead Discovery APIs
| Service | What We Use It For | Cost |
|---|---|---|
| Google Places API | Google Business Profiles, reviews, ratings | $17/1000 requests |
| Indeed Publisher API | Job postings as hiring signals | Free (limited) |
| LinkedIn Jobs API | Job posting signals | Requires LinkedIn Partner Program |
| BuiltWith API | Detect tech stack of any website | $249–$999/month |
| DataForSEO | SEO rankings, keyword tracking | $0.0001–$0.001/request |
| Hunter.io | Find email addresses from domain | $49–$399/month |
| Apollo.io API | B2B contact data enrichment | $49–$99/month |
| Clearbit (now Breyta) | Company data enrichment | Custom pricing |

### Communication APIs
| Service | What We Use It For | Cost |
|---|---|---|
| SendGrid API | Send and track emails | $19.95+/month |
| Amazon SES | Bulk email fallback | $0.10 per 1000 emails |
| Twilio | Send SMS messages | $0.0079/SMS |
| Calendly API | Embed meeting booking | Free–$16/user/month |

### CRM Integrations (for "Sync to CRM" feature)
| CRM | Integration Method |
|---|---|
| HubSpot | HubSpot API v3 (REST) |
| Salesforce | Salesforce REST API |
| Pipedrive | Pipedrive API v1 |
| GoHighLevel | GHL REST API |

### Compliance APIs
| Service | What We Use It For | Cost |
|---|---|---|
| DNC.com or Twilio Lookup | Check Do-Not-Call list | Per-lookup pricing |
| Abstract API | Phone/email validation | Free–$14/month |

### Payment APIs
| Service | What We Use It For |
|---|---|
| Stripe Billing | Subscriptions, usage-based billing |
| Stripe Connect | If agencies bill their own clients |
| Stripe Webhooks | React to payment events (cancel, upgrade, etc.) |

---

## 6. DATABASE — TABLES & FIELDS

### Core Tables

**users**
```
id, email, password_hash, name, avatar_url, role,
organization_id, created_at, last_login_at
```

**organizations** (one per agency or company)
```
id, name, plan (starter/growth/agency/enterprise),
stripe_customer_id, stripe_subscription_id,
white_label_settings (JSON), lead_credits_remaining,
created_at
```

**sub_accounts** (clients under an agency)
```
id, organization_id, client_name, client_logo,
vertical (dental/roofing/etc.), settings (JSON),
created_at
```

**leads**
```
id, organization_id, sub_account_id,
first_name, last_name, email, phone,
company_name, company_website, title,
industry, city, state, country,
intent_score (0-100), fit_score (0-100), compliance_score (0-100),
buying_window, status (new/qualified/in_sequence/engaged/booked/closed),
signals (JSON array), source,
verified_email (bool), verified_phone (bool),
unsubscribed_at, created_at, updated_at
```

**signals** (individual buying signals detected)
```
id, lead_id, signal_type (hiring/review_drop/seo_drop/new_location/tech_change),
signal_strength (1-10), source_url, raw_data (JSON),
detected_at, expires_at
```

**campaigns**
```
id, organization_id, sub_account_id, name,
vertical, status (draft/active/paused/completed),
channel (email/linkedin/sms/multi),
settings (JSON), total_leads, created_at
```

**sequences** (steps inside a campaign)
```
id, campaign_id, step_number, channel,
delay_hours, subject_template, body_template,
ai_personalize (bool), conditions (JSON)
```

**campaign_leads** (which leads are in which campaign)
```
id, campaign_id, lead_id,
current_step, status (active/paused/completed/unsubscribed/bounced),
enrolled_at, completed_at
```

**interactions** (every message sent or received)
```
id, lead_id, campaign_id, sequence_id,
type (sent/opened/clicked/replied/bounced/unsubscribed),
channel, subject, body, ai_generated (bool),
reply_class (interested/question/objection/not_interested/ooo),
sent_at, opened_at
```

**meetings** (booked meetings)
```
id, lead_id, organization_id,
calendly_event_id, scheduled_at, duration_minutes,
status (scheduled/completed/no_show/cancelled),
qualified (bool), notes
```

**deals** (closed revenue — linked from CRM or manual)
```
id, lead_id, organization_id,
amount, currency, closed_at, source_campaign_id,
crm_deal_id, created_at
```

**templates** (email/linkedin templates)
```
id, organization_id, name, channel,
subject, body, vertical, is_shared (bool),
open_rate, reply_rate, created_at
```

**compliance_logs**
```
id, lead_id, event_type (unsubscribe/consent/deletion/quarantine),
jurisdiction, reason, created_at
```

**api_keys** (for integrations)
```
id, organization_id, service (hubspot/salesforce/etc.),
encrypted_key, scopes, created_at
```

**usage_logs** (for billing — track credit usage)
```
id, organization_id, action (lead_found/email_sent/meeting_booked),
credits_used, created_at
```

---

## 7. BACKEND — API ROUTES TO BUILD

### Auth Routes
```
POST   /api/auth/register          — Create account
POST   /api/auth/login             — Login
POST   /api/auth/logout            — Logout
POST   /api/auth/forgot-password   — Send reset email
POST   /api/auth/reset-password    — Set new password
GET    /api/auth/me                — Get current user
```

### Lead Routes
```
GET    /api/leads                  — List leads (with filters)
POST   /api/leads/search           — Search/discover new leads
GET    /api/leads/:id              — Get one lead (full profile)
PATCH  /api/leads/:id              — Update lead status
DELETE /api/leads/:id              — Delete lead
POST   /api/leads/:id/enrich       — Enrich lead with more data
GET    /api/leads/:id/score        — Get/recalculate intent score
GET    /api/leads/:id/signals      — Get all signals for a lead
GET    /api/leads/:id/history      — Get interaction history
POST   /api/leads/import           — Bulk import from CSV
GET    /api/leads/export           — Export to CSV
```

### Campaign Routes
```
GET    /api/campaigns              — List all campaigns
POST   /api/campaigns              — Create campaign
GET    /api/campaigns/:id          — Get campaign detail
PATCH  /api/campaigns/:id          — Update campaign
DELETE /api/campaigns/:id          — Delete campaign
POST   /api/campaigns/:id/start    — Launch campaign
POST   /api/campaigns/:id/pause    — Pause campaign
POST   /api/campaigns/:id/resume   — Resume campaign
GET    /api/campaigns/:id/analytics — Get campaign stats
POST   /api/campaigns/:id/leads    — Add leads to campaign
```

### Sequence Routes
```
GET    /api/campaigns/:id/sequences     — Get all steps
POST   /api/campaigns/:id/sequences     — Add a step
PATCH  /api/sequences/:id               — Edit a step
DELETE /api/sequences/:id               — Remove a step
POST   /api/sequences/:id/preview       — Preview AI-generated email
```

### AI Routes
```
POST   /api/ai/generate-email      — Write a personalized email
POST   /api/ai/generate-linkedin   — Write a LinkedIn note
POST   /api/ai/classify-reply      — Read a reply and classify it
POST   /api/ai/suggest-response    — Write a response to a reply
POST   /api/ai/score-lead          — AI-assisted lead scoring
```

### Signal / Alert Routes
```
GET    /api/signals                — Get live signal feed
POST   /api/signals/scan           — Trigger a manual scan
GET    /api/signals/:leadId        — Signals for a specific lead
```

### Analytics Routes
```
GET    /api/analytics/dashboard    — Main KPI metrics
GET    /api/analytics/funnel       — Funnel breakdown
GET    /api/analytics/sources      — Performance by signal source
GET    /api/analytics/campaigns    — Performance by campaign
GET    /api/analytics/roi          — ROI calculation
GET    /api/analytics/reports/weekly   — Weekly report
GET    /api/analytics/reports/monthly  — Monthly ROI report
```

### Team Routes
```
GET    /api/team                   — List team members
POST   /api/team/invite            — Invite a user
PATCH  /api/team/:userId/role      — Change a user's role
DELETE /api/team/:userId           — Remove a user
```

### Client / Sub-Account Routes (Agency tier)
```
GET    /api/clients                — List all clients
POST   /api/clients                — Create a client account
GET    /api/clients/:id            — Client dashboard
PATCH  /api/clients/:id            — Update client
DELETE /api/clients/:id            — Remove client
GET    /api/clients/overview       — All clients at a glance
```

### Billing Routes
```
GET    /api/billing/plan           — Current plan details
POST   /api/billing/upgrade        — Upgrade plan
POST   /api/billing/cancel         — Cancel subscription
GET    /api/billing/invoices       — Invoice history
GET    /api/billing/usage          — Credit usage
POST   /api/billing/webhook        — Stripe webhook receiver
```

### Integration Routes
```
POST   /api/integrations/hubspot/connect     — Connect HubSpot
POST   /api/integrations/salesforce/connect  — Connect Salesforce
POST   /api/integrations/calendly/connect    — Connect Calendly
POST   /api/integrations/ghl/connect         — Connect GoHighLevel
GET    /api/integrations                     — List connected integrations
DELETE /api/integrations/:service            — Disconnect integration
POST   /api/integrations/crm/sync-lead/:id  — Push lead to CRM
```

### Compliance Routes
```
POST   /api/compliance/unsubscribe  — Process unsubscribe
GET    /api/compliance/score/:leadId — Get compliance score
GET    /api/compliance/report       — Export compliance report
POST   /api/compliance/delete/:leadId — GDPR deletion request
```

### Webhook Routes (inbound — from email providers)
```
POST   /api/webhooks/sendgrid       — Email events (open, click, reply, bounce)
POST   /api/webhooks/twilio         — SMS replies
POST   /api/webhooks/calendly       — Meeting booked/cancelled
POST   /api/webhooks/stripe         — Payment events
```

---

## 8. FRONTEND — COMPONENTS TO BUILD

### Layout Components
```
AppShell          — Wraps all dashboard pages (sidebar + header + content)
Sidebar           — Navigation menu (collapsible)
TopBar            — Search, notifications, user avatar
PageHeader        — Title + action buttons for each page
```

### Dashboard Components
```
StatsCard         — Single KPI card (value, label, trend arrow)
StatsGrid         — 4-column grid of StatsCards
FunnelChart       — Visual funnel (leads → meetings → deals)
RevenueChart      — Line chart of MRR / revenue over time
SmartInsightCard  — AI-generated weekly insight for the user
```

### Lead Components
```
LeadTable         — Sortable, filterable table of leads
LeadRow           — One row in the table (avatar, name, score, status, actions)
LeadCard          — Card view of a lead
LeadDetail        — Full lead profile page
IntentScoreBadge  — Color-coded score display (0–100)
SignalTag         — Small tag showing signal type (hiring, review drop, etc.)
LeadFilters       — Filter panel (industry, score, status, location)
LeadImportModal   — CSV upload modal
```

### Campaign Components
```
CampaignList      — Grid of all campaigns
CampaignCard      — One campaign card (name, status, stats)
CampaignBuilder   — Step-by-step campaign creation
SequenceEditor    — Drag-and-drop email sequence builder
SequenceStep      — One step in the sequence
EmailPreview      — Preview what an AI email will look like
ABTestPanel       — Set up A/B tests on subject lines
```

### Alert / Signal Components
```
SignalFeed        — Live scrolling feed of signals
SignalItem        — One signal card (company, type, detail, time, action button)
AlertBadge        — Live pulse indicator
```

### Analytics Components
```
FunnelBar         — Horizontal bar showing funnel percentages
SourceTable       — Table: which signal source generates best leads
ROICalculator     — Input subscription cost, output revenue/ROI
ReportCard        — Weekly/monthly report summary card
CohortChart       — Compare lead batches over time
```

### Outreach / AI Components
```
ReplyInbox        — View all incoming replies
ReplyCard         — One reply card with AI classification badge
AIResponseEditor  — Edit AI-suggested reply before sending
MeetingCard       — A booked meeting card
TemplateLibrary   — Browse and select email templates
TemplateEditor    — Write/edit a template
BrandVoiceSetup   — Tell the AI how the agency sounds (formal/casual/etc.)
```

### Settings Components
```
ProfileForm       — Edit name, email, password
OrgSettingsForm   — Edit org name, logo
WhiteLabelForm    — Set custom domain, colors, logo (Agency tier)
IntegrationsList  — Show connected/disconnected integrations
IntegrationCard   — One integration with connect/disconnect button
TeamMemberRow     — One team member row with role dropdown
InviteModal       — Send email invite to new team member
PlanCard          — Current plan display
UsageBar          — Show credit usage for the month
BillingHistory    — Invoice table
```

### Shared / Utility Components
```
Button            — Primary, secondary, danger, ghost variants
Input             — Text input with label and error state
Select            — Dropdown select
Modal             — Overlay modal with backdrop
Toast             — Notification toast (success/error/info)
Badge             — Small label pill (status, tier, etc.)
Avatar            — User/company avatar with fallback initials
EmptyState        — "Nothing here yet" placeholder with CTA
LoadingSpinner    — Loading indicator
ConfirmDialog     — "Are you sure?" confirmation modal
Tooltip           — Hover explanation
Tabs              — Tab navigation within a page
Pagination        — Page navigation for long lists
SearchBar         — Global and local search inputs
DateRangePicker   — Select a date range for reports
```

---

## 9. AI FUNCTIONS

All AI calls go through the Claude API (or OpenAI as fallback). Every function below is a call to the AI with a structured prompt.

### Email Generation
```typescript
generateOutreachEmail(params: {
  lead: Lead,
  signal: Signal,
  template?: string,
  brandVoice: string,  // "professional", "casual", "bold"
  sequenceStep: number
}) => { subject: string, body: string, preview: string }
```

**What to put in the prompt:**
- Lead's name, company, role
- The signal (what we detected about them)
- The brand voice setting
- Which step this is (intro / follow-up / breakup)
- Any previous messages sent to this lead

### Reply Classification
```typescript
classifyReply(params: {
  emailBody: string,
  leadContext: Lead
}) => {
  class: 'interested' | 'question' | 'objection' | 'not_interested' | 'ooo' | 'unclear',
  confidence: number,  // 0.0 to 1.0
  sentiment: 'positive' | 'neutral' | 'negative',
  suggestedAction: string
}
```

### Response Generation
```typescript
generateResponse(params: {
  replyClass: string,
  originalEmail: string,
  reply: string,
  lead: Lead,
  knowledgeBase: string[],  // pricing, case studies, objection playbook
}) => { body: string, subject: string }
```

### Lead Enrichment
```typescript
enrichLeadWithAI(params: {
  companyName: string,
  website: string,
  signals: Signal[]
}) => {
  painPoints: string[],      // top 3 pain points detected
  recommendedAngle: string,  // best hook to use
  estimatedBuyingWindow: string
}
```

### Smart Insights
```typescript
generateSmartInsight(params: {
  organizationId: string,
  period: 'week' | 'month'
}) => {
  insight: string,   // human-readable observation
  metric: string,    // what data it's based on
  recommendation: string
}
```

---

## 10. EMAIL & OUTREACH FUNCTIONS

### Sending
```typescript
sendEmail(params: {
  to: string,
  from: string,
  subject: string,
  body: string,
  trackOpens: boolean,
  trackClicks: boolean,
  campaignId: string,
  leadId: string
}) => { messageId: string, status: string }
```

### Tracking (via SendGrid webhooks)
When SendGrid sends us an event, call:
```typescript
handleEmailEvent(event: {
  type: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed' | 'replied',
  messageId: string,
  timestamp: number,
  email: string
})
```

### Deliverability
- Always warm up new sending domains before blasting (start with 20 emails/day, ramp up over 4–6 weeks)
- Use a separate subdomain for sending (e.g., `outreach.youragency.com`)
- Include unsubscribe link in every email (required by CAN-SPAM)
- Include physical mailing address in footer (required by CAN-SPAM)
- Monitor bounce rate — pause sending if it exceeds 2%

### Sequence Scheduler (Background Job)
```typescript
// Runs every hour via BullMQ
processSequenceQueue() {
  // Find all campaign_leads where:
  //   status = 'active'
  //   AND next_send_at <= now()
  //   AND compliance_score >= 70
  // For each one: send the next sequence step
  // Then calculate next_send_at based on delay_hours
}
```

---

## 11. COMPLIANCE FUNCTIONS

### On Lead Creation
```typescript
onLeadCreated(lead) {
  1. detectJurisdiction(lead.country, lead.state)
  2. calculateComplianceScore(lead)
  3. if score < 70: quarantineLead(lead.id, 'low_compliance_score')
  4. logEvent(lead.id, 'lead_created', jurisdiction)
}
```

### On Unsubscribe
```typescript
onUnsubscribe(email, channel) {
  1. Set lead.unsubscribed_at = now()
  2. Pause all active sequences for this lead
  3. Log to compliance_logs
  4. If via email: process within 10 days (CAN-SPAM requirement)
  5. If via SMS: process immediately (TCPA requirement)
  6. Never contact this person on this channel again
}
```

### GDPR Right to Erasure
```typescript
deleteLeadData(leadId) {
  1. Anonymize: replace name/email/phone with 'DELETED'
  2. Delete all interactions
  3. Delete all signals
  4. Keep compliance_log (required for audit trail)
  5. Log deletion with timestamp
}
```

### Data Retention Policy
- Auto-delete inactive leads after 2 years
- Run `cleanupExpiredLeads()` every night as a cron job
- Send warning email to org 30 days before deletion

---

## 12. BILLING & PRICING LOGIC

### The 4 Plans
| Plan | Price/month | Lead Credits | Users | Channels |
|---|---|---|---|---|
| Starter | $97 | 500 | 1 | Email only |
| Growth | $297 | 2,500 | 5 | Email + LinkedIn |
| Agency | $997 | 15,000 | Unlimited | Email + LinkedIn + SMS |
| Enterprise | $2,997+ | Unlimited | Unlimited | All + custom |

### What Counts as 1 Credit
- 1 lead discovered = 1 credit
- Sending emails does NOT cost credits
- Enriching a lead = 1 credit
- Additional credits: $0.10 each

### Stripe Setup Needed
- Create 4 products in Stripe (one per plan)
- Create a price for each (monthly recurring)
- Use Stripe Webhooks to update `organizations.plan` when payments succeed/fail
- Use Stripe Customer Portal for users to manage their own billing

### Key Stripe Events to Handle
```
customer.subscription.created   → Activate plan, grant credits
customer.subscription.updated   → Change plan, adjust credits
customer.subscription.deleted   → Downgrade to free/lock account
invoice.payment_failed          → Send warning email, retry
invoice.payment_succeeded       → Log payment, refresh credits
```

### Pay-Per-Meeting Logic
- If meeting is "qualified" (attended, decision-maker, expressed interest, lasted 15+ min)
- Charge $150–$500 based on vertical setting
- Invoice automatically via Stripe
- Log to `meetings` table with `qualified = true`

---

## 13. AGENCY & MULTI-TENANT LOGIC

### How Data Is Isolated
Every database query for leads, campaigns, and analytics must filter by `organization_id`.

```typescript
// ALWAYS do this — never query without org filter
const leads = await db.lead.findMany({
  where: { organization_id: currentUser.organization_id }
})
```

### Role Permissions
| Action | Admin | Manager | Sales Rep | Viewer |
|---|---|---|---|---|
| Create/delete campaigns | YES | YES | NO | NO |
| View all leads | YES | YES | YES | YES |
| Export leads | YES | YES | NO | NO |
| Add team members | YES | NO | NO | NO |
| View billing | YES | NO | NO | NO |
| Change white-label | YES | NO | NO | NO |
| Manage client accounts | YES | YES | NO | NO |

### White-Label Setup
Agencies on the Agency plan can:
- Set a custom logo (stored in S3/R2)
- Set a custom color palette
- Set a custom domain (requires DNS CNAME setup)
- Custom "from" email address for outreach

Store all this in `organizations.white_label_settings` as JSON:
```json
{
  "logo_url": "https://...",
  "primary_color": "#3B82F6",
  "custom_domain": "leads.theiragency.com",
  "from_email": "outreach@theiragency.com",
  "from_name": "Their Agency"
}
```

---

## 14. BUILD ORDER — WHAT TO BUILD FIRST

Build in this exact order. Do not skip ahead. Each phase unlocks the next.

### Phase 1 — Foundation (Weeks 1–4)
The goal: A real app that real users can log in to.

```
Week 1
  ✓ Set up PostgreSQL database (Railway or Supabase)
  ✓ Set up Prisma with full schema
  ✓ Set up Supabase Auth (login, register, sessions)
  ✓ Build login and register pages
  ✓ Build protected route middleware (redirect if not logged in)
  ✓ Build basic dashboard shell (sidebar, topbar, layout)

Week 2
  ✓ Build organization creation on register
  ✓ Build user profile settings page
  ✓ Connect Stripe (plans, checkout, webhooks)
  ✓ Build billing page (current plan, upgrade button)
  ✓ Build credit tracking (deduct on lead discovery)

Week 3
  ✓ Build leads database and API routes (CRUD)
  ✓ Build leads list page (table with filters, sort)
  ✓ Build lead detail page (all info, signals, history)
  ✓ Build lead import (CSV upload)
  ✓ Build manual lead scoring (formula from Module 1)

Week 4
  ✓ Wire up first real data source: Google Places API
  ✓ Build signal detection: review sentiment drop
  ✓ Build signal detection: job posting via Indeed
  ✓ Show real leads in the dashboard from real scans
  ✓ Build the Live Alerts feed
```

### Phase 2 — Core Product (Weeks 5–8)
The goal: Users can find leads AND send AI-powered emails.

```
Week 5
  ✓ Connect Claude API
  ✓ Build generateOutreachEmail() function
  ✓ Build email preview in UI
  ✓ Build template library (CRUD)
  ✓ Connect SendGrid for sending

Week 6
  ✓ Build campaign creation flow
  ✓ Build sequence builder (add steps, set delays)
  ✓ Build campaign launch (enroll leads, start sending)
  ✓ Build BullMQ job queue for scheduled sending
  ✓ Set up SendGrid webhooks (open/click/bounce tracking)

Week 7
  ✓ Build reply inbox page
  ✓ Build classifyReply() function
  ✓ Build generateResponse() function
  ✓ Build AI auto-response flow (with confidence threshold)
  ✓ Connect Calendly API for meeting booking

Week 8
  ✓ Build compliance engine (score, quarantine, unsubscribe)
  ✓ Build analytics dashboard (real data from DB)
  ✓ Build funnel visualization
  ✓ Build ROI calculator
  ✓ Build weekly/monthly reports
```

### Phase 3 — Agency Features (Weeks 9–12)
The goal: Agencies can manage multiple clients and white-label the platform.

```
Week 9
  ✓ Build sub-account (client) creation
  ✓ Build client dashboard (scoped to one client)
  ✓ Build agency overview (all clients at a glance)
  ✓ Build role-based access control

Week 10
  ✓ Build white-label settings (logo, colors, domain)
  ✓ Build team management (invite, roles, remove)
  ✓ Build template sharing across client accounts
  ✓ Build performance leaderboard

Week 11
  ✓ Build HubSpot integration (push leads/deals to CRM)
  ✓ Build Salesforce integration
  ✓ Build GoHighLevel integration
  ✓ Build "Sync to CRM" button on lead table

Week 12
  ✓ Add LinkedIn outreach channel (Growth+ tier)
  ✓ Add SMS outreach channel (Agency+ tier)
  ✓ Build GDPR deletion flow
  ✓ Build compliance export report
  ✓ Polish, bug fixes, performance
```

---

## 15. ENVIRONMENT VARIABLES NEEDED

Create a `.env.local` file. Never commit this to git.

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth (Supabase)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# AI
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."        # optional backup

# Email Sending
SENDGRID_API_KEY="SG...."
SENDGRID_FROM_EMAIL="outreach@Agnelix.com"
SENDGRID_WEBHOOK_SECRET="..."

# SMS
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+1..."

# Payments
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_GROWTH_PRICE_ID="price_..."
STRIPE_AGENCY_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."

# Lead Discovery APIs
GOOGLE_PLACES_API_KEY="AIza..."
BUILTWITH_API_KEY="..."
DATAFORSEO_LOGIN="..."
DATAFORSEO_PASSWORD="..."
HUNTER_API_KEY="..."

# Meeting Booking
CALENDLY_API_KEY="..."
CALENDLY_WEBHOOK_SECRET="..."

# Cache / Queue
REDIS_URL="redis://..."
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# File Storage
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"
AWS_S3_BUCKET="Agnelix-files"

# App
NEXTAUTH_SECRET="..."
NEXT_PUBLIC_APP_URL="https://app.Agnelix.com"
```

---

## 16. PRICING TIERS SUMMARY

| Feature | Starter $97 | Growth $297 | Agency $997 | Enterprise $2,997+ |
|---|---|---|---|---|
| Lead credits/month | 500 | 2,500 | 15,000 | Unlimited |
| User seats | 1 | 5 | Unlimited | Unlimited |
| Vertical playbooks | 1 | 3 | All | All + custom |
| Email outreach | YES | YES | YES | YES |
| LinkedIn outreach | NO | YES | YES | YES |
| SMS outreach | NO | NO | YES | YES |
| AI reply handling | NO | NO | YES | YES |
| Revenue attribution | NO | YES | YES | YES |
| White-label | NO | NO | YES | YES |
| Multi-client (sub-accounts) | NO | NO | YES | YES |
| API access | NO | Read-only | Full | Full |
| Dedicated account manager | NO | NO | NO | YES |
| Custom AI training | NO | NO | NO | YES |
| Support SLA | 48h | 24h | 4h | 1h |

**Add-ons (Growth tier):**
- Extra user: $49/month
- Extra vertical playbook: $97 one-time
- Extra lead credits: $0.10 each

---

## 17. KEY NUMBERS TO KNOW

These are from the business plan — use them as targets when building the product.

### Product Targets
| Metric | Target |
|---|---|
| Time to find 50 leads | Under 60 seconds |
| Time to first meeting booked | Under 14 days from signup |
| AI reply classification accuracy | Above 85% |
| Email bounce rate | Keep below 2% |
| Compliance score threshold | Quarantine below 70 |
| API response time | Under 200ms |
| Uptime target | 99.9% |

### Business Targets (Year 1)
| Month | Customers | MRR |
|---|---|---|
| Month 1 | 5 | $1,485 |
| Month 3 | 16 | $4,752 |
| Month 6 | 50 | $14,850 |
| Month 9 | 120 | $35,640 |
| Month 12 | 280 | $83,160 |

### Unit Economics to Track
| Metric | Target |
|---|---|
| Customer Acquisition Cost (CAC) | Below $350 blended |
| Monthly churn (Starter) | Below 5% |
| Monthly churn (Growth) | Below 3% |
| Monthly churn (Agency) | Below 2% |
| Gross Margin | Above 78% |
| LTV:CAC Ratio | Above 10:1 |

### North Star Metric
> **Weekly Qualified Meetings Booked Per Customer**
> This is the single most important number. If this goes up, everything else follows.

---

*Document Version 1.0 | Agnelix Build Guide | May 2026*
*Keep this updated as the product evolves.*
