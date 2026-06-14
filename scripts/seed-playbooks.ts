import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const PLAYBOOK_SEEDS = [
  {
    type: "social_media",
    name: "Social Media Agency",
    targetVerticals: ["boutique hotels", "salons", "dentists", "restaurants", "fitness studios"],
    discoveryMethod: "maps",
    platformOptions: ["Instagram", "TikTok", "Pinterest", "Facebook", "YouTube"],
    sequenceTemplates: [
      { id: "sm_seq_1", name: "Instagram Growth Prospecting", steps: 4, description: "4-step email sequence highlighting visual content opportunities." },
      { id: "sm_seq_2", name: "TikTok Video Strategy Outreach", steps: 3, description: "3-step sequence focusing on short-form video potential." }
    ],
    proposalTemplates: [
      { id: "sm_prop_1", name: "Instagram Growth Package", description: "30 posts + 15 reels + community management", price: 1200, setupPrice: 1200, period: "monthly", currency: "GBP" },
      { id: "sm_prop_2", name: "TikTok Viral Package", description: "15 original videos + TikTok SEO + influencer outreach", price: 1500, setupPrice: 1000, period: "monthly", currency: "GBP" }
    ],
    reportMetrics: ["posts_managed", "engagement_rate", "follower_growth", "reach", "top_posts"],
    reportTemplates: [
      { id: "sm_rep_1", name: "Instagram Monthly Report", description: "Engagement, reach, and follower metrics overview" }
    ],
    portalTemplates: [
      { id: "sm_port_1", name: "Client Social Hub", description: "Content calendar, video catalog, and live social charts" }
    ],
    portalSections: ["content_calendar", "recent_posts", "engagement_stats", "follower_growth"],
    toneOptions: ["friendly", "trendy", "professional", "consultative"],
    objectionHandlers: [
      { objection: "I already have a social media manager", response: "That's great! We actually work alongside existing managers to handle specialized production, TikTok video editing, or paid amplifications." },
      { objection: "I don't think my customers are on TikTok/Instagram", response: "Actually, 82% of local consumers search for businesses on Instagram before visiting, and TikTok is now the primary search engine for Gen Z/Millennials." }
    ]
  },
  {
    type: "seo",
    name: "SEO Agency",
    targetVerticals: ["law firms", "plumbers", "roofers", "cosmetic clinics", "veterinarians"],
    discoveryMethod: "maps",
    platformOptions: ["Google Search", "Google Business Profile", "Bing"],
    sequenceTemplates: [
      { id: "seo_seq_1", name: "Local SEO Audit Hook", steps: 3, description: "3-step sequence sharing 3 critical website errors hurting rankings." }
    ],
    proposalTemplates: [
      { id: "seo_prop_1", name: "Local SEO Domination", description: "Keyword research, technical fixes, and GBP optimization", price: 950, setupPrice: 1500, period: "monthly", currency: "GBP" }
    ],
    reportMetrics: ["keywords_ranked", "organic_traffic", "gbp_views", "calls_generated", "backlinks_built"],
    reportTemplates: [
      { id: "seo_rep_1", name: "Monthly SEO Dashboard", description: "Organic traffic growth, keywords, and lead calls tracking" }
    ],
    portalTemplates: [
      { id: "seo_port_1", name: "SEO Portal", description: "Google Rankings tracker, technical audit logs, and backlink manager" }
    ],
    portalSections: ["keyword_rankings", "traffic_dashboard", "backlink_report", "recent_technical_fixes"],
    toneOptions: ["professional", "direct", "consultative"],
    objectionHandlers: [
      { objection: "We are already ranking high enough", response: "I noticed you rank well for brand terms, but you are currently missing out on high-intent buyer searches like 'emergency plumber [city]', which gets over 500 searches/mo." },
      { objection: "SEO takes too long", response: "While authority building takes time, we specialize in 'low-hanging fruit' optimizations (like schema markup and GBP reviews) that typically yield visibility increases in the first 30 days." }
    ]
  },
  {
    type: "ppc",
    name: "PPC & Paid Ads Agency",
    targetVerticals: ["HVAC contractors", "real estate agencies", "gyms", "dental implants", "solar installers"],
    discoveryMethod: "maps",
    platformOptions: ["Google Ads", "Meta Ads", "Local Services Ads"],
    sequenceTemplates: [
      { id: "ppc_seq_1", name: "Ad Spend Audit / Competitor Ad Spies", steps: 4, description: "4-step sequence showing what their competitors are spending on ads." }
    ],
    proposalTemplates: [
      { id: "ppc_prop_1", name: "Meta Lead Gen Funnel", description: "Creative design, ad management, and automated SMS follow-up setup", price: 1500, setupPrice: 1500, period: "monthly", currency: "GBP" }
    ],
    reportMetrics: ["ad_spend", "clicks", "leads_captured", "cost_per_lead", "roi_return"],
    reportTemplates: [
      { id: "ppc_rep_1", name: "PPC ROI Summary", description: "Cost per lead, ad spend efficiency, and customer acquisition cost" }
    ],
    portalTemplates: [
      { id: "ppc_port_1", name: "PPC Lead Center", description: "Real-time lead inbox, ad spend breakdown, and pipeline conversions" }
    ],
    portalSections: ["ad_performance", "lead_feed", "spend_summary"],
    toneOptions: ["professional", "direct", "analytical"],
    objectionHandlers: [
      { objection: "We tried Facebook/Google ads before and they didn't work", response: "Often, ads fail because they send traffic directly to a homepage instead of a dedicated high-converting landing page. Our system maps ads directly to customized booking funnels." }
    ]
  },
  {
    type: "sales",
    name: "Sales & B2B Lead Gen",
    targetVerticals: ["SaaS startups", "recruitment agencies", "commercial cleaning", "office supply", "logistics companies"],
    discoveryMethod: "linkedin",
    platformOptions: ["Cold Email", "LinkedIn Outreach", "Cold Calling"],
    sequenceTemplates: [
      { id: "sales_seq_1", name: "B2B Outreach Sequence", steps: 5, description: "5-step sequence featuring pain point solving and case studies." }
    ],
    proposalTemplates: [
      { id: "sales_prop_1", name: "Outbound Lead Gen Autopilot", description: "Custom database building, scriptwriting, and email inbox management", price: 2000, setupPrice: 2000, period: "monthly", currency: "GBP" }
    ],
    reportMetrics: ["emails_sent", "open_rate", "replies_received", "meetings_booked", "qualified_leads"],
    reportTemplates: [
      { id: "sales_rep_1", name: "SDR Performance Tracker", description: "Email metrics, positive response rates, and calendar bookings" }
    ],
    portalTemplates: [
      { id: "sales_port_1", name: "Outbound Command Center", description: "Live reply streams, booking calendar, and database overview" }
    ],
    portalSections: ["outbox_stats", "inbox_replies", "meetings_booked_list"],
    toneOptions: ["professional", "consultative", "direct"],
    objectionHandlers: [
      { objection: "Send me some info", response: "I'd be happy to. To ensure I send what's most relevant: are you looking to solve [Pain Point A] or scale [Process B]?" }
    ]
  },
  {
    type: "finance",
    name: "Fractional CFO & Finance",
    targetVerticals: ["manufacturing", "e-commerce brands", "construction companies", "digital agencies"],
    discoveryMethod: "linkedin",
    platformOptions: ["Xero", "Quickbooks", "Excel"],
    sequenceTemplates: [
      { id: "fin_seq_1", name: "CFO Advisory Outreach", steps: 3, description: "3-step sequence targeting cashflow forecasting and tax strategies." }
    ],
    proposalTemplates: [
      { id: "fin_prop_1", name: "Fractional CFO Advisory", description: "Weekly cashflow management, tax planning, and monthly board meetings", price: 3000, setupPrice: 2500, period: "monthly", currency: "GBP" }
    ],
    reportMetrics: ["cashflow_runway", "tax_savings", "profit_margin", "working_capital", "overhead_ratio"],
    reportTemplates: [
      { id: "fin_rep_1", name: "CFO Financial Digest", description: "Monthly margin review, runway forecast, and overhead targets" }
    ],
    portalTemplates: [
      { id: "fin_port_1", name: "Financial Boardroom", description: "P&L tracking, runway charts, and strategic recommendations portal" }
    ],
    portalSections: ["financial_charts", "runway_forecaster", "document_vault"],
    toneOptions: ["professional", "consultative"],
    objectionHandlers: [
      { objection: "We already have an accountant", response: "An accountant handles compliance and backward-looking books. We act as a forward-looking partner, forecasting cashflow and steering strategic profit decisions." }
    ]
  },
  {
    type: "web_design",
    name: "Web Design & Development",
    targetVerticals: ["boutique hotels", "medical spas", "architects", "consultancies", "contractors"],
    discoveryMethod: "maps",
    platformOptions: ["Figma", "WordPress", "Webflow", "Next.js"],
    sequenceTemplates: [
      { id: "web_seq_1", name: "Mobile/Speed Redesign Pitch", steps: 3, description: "3-step sequence showing why their current site loses mobile buyers." }
    ],
    proposalTemplates: [
      { id: "web_prop_1", name: "Custom Webflow Website", description: "5 pages + responsive design + on-page SEO + custom CMS", price: 3500, setupPrice: 3500, period: "one-off", currency: "GBP" }
    ],
    reportMetrics: ["site_speed_score", "mobile_ux_rating", "conversion_rate", "visitor_engagement"],
    reportTemplates: [
      { id: "web_rep_1", name: "Post-Launch Performance", description: "Speed scores, Core Web Vitals, and conversion rate comparison" }
    ],
    portalTemplates: [
      { id: "web_port_1", name: "Design Feedback Hub", description: "Figma wireframes dashboard, content checklist, and asset uploader" }
    ],
    portalSections: ["design_proofs", "content_assets", "milestones_tracker"],
    toneOptions: ["professional", "friendly", "consultative"],
    objectionHandlers: [
      { objection: "My website is fine, it was rebuilt 4 years ago", response: "Web standards, mobile responsive metrics, and Google Core Web Vitals have changed completely in the last 24 months. 4-year-old sites typically lose 40%+ of mobile traffic due to speed issues." }
    ]
  }
];

async function main() {
  console.log("Seeding playbooks directly via driver adapter...");
  for (const seed of PLAYBOOK_SEEDS) {
    const playbook = await prisma.playbook.upsert({
      where: { type: seed.type },
      update: seed,
      create: seed,
    });
    console.log(`- Seeded playbook: ${playbook.name} (${playbook.type})`);
  }
  console.log("Playbook seeding complete! 🚀");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
