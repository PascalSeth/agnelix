/* eslint-disable @typescript-eslint/no-explicit-any */
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  await prisma.$transaction([
    prisma.activity.deleteMany({ where: { lead: { userId } } }),
    prisma.email.deleteMany({ where: { lead: { userId } } }),
    prisma.reply.deleteMany({ where: { lead: { userId } } }),
    prisma.campaignLead.deleteMany({ where: { campaign: { userId } } }),
    prisma.pendingAction.deleteMany({ where: { userId } }),
    prisma.agentMemory.deleteMany({ where: { userId } }),
    prisma.agentDigestLog.deleteMany({ where: { userId } }),
    prisma.note.deleteMany({ where: { lead: { userId } } }),
    prisma.proposal.deleteMany({ where: { userId } }),
    prisma.clientReport.deleteMany({ where: { userId } }),
    prisma.clientPortal.deleteMany({ where: { campaign: { userId } } }),
    prisma.autoSearch.deleteMany({ where: { userId } }),
    prisma.caseStudy.deleteMany({ where: { userId } }),
    prisma.lead.deleteMany({ where: { userId } }),
    prisma.campaign.deleteMany({ where: { userId } }),
    prisma.sequenceStep.deleteMany({ where: { sequence: { userId } } }),
    prisma.sequence.deleteMany({ where: { userId } }),
  ])

  return NextResponse.json({ success: true })
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  // 1. Get active user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { playbookType: true, email: true }
  })
  const playbookType = user?.playbookType || "sales"

  // 2. Cascade wipe existing data owned by this user
  await prisma.$transaction([
    prisma.activity.deleteMany({ where: { lead: { userId } } }),
    prisma.email.deleteMany({ where: { lead: { userId } } }),
    prisma.reply.deleteMany({ where: { lead: { userId } } }),
    prisma.campaignLead.deleteMany({ where: { campaign: { userId } } }),
    prisma.pendingAction.deleteMany({ where: { userId } }),
    prisma.agentMemory.deleteMany({ where: { userId } }),
    prisma.agentDigestLog.deleteMany({ where: { userId } }),
    prisma.note.deleteMany({ where: { lead: { userId } } }),
    prisma.proposal.deleteMany({ where: { userId } }),
    prisma.clientReport.deleteMany({ where: { userId } }),
    prisma.clientPortal.deleteMany({ where: { campaign: { userId } } }),
    prisma.autoSearch.deleteMany({ where: { userId } }),
    prisma.sequenceStep.deleteMany({ where: { sequence: { userId } } }),
    prisma.sequence.deleteMany({ where: { userId } }),
    prisma.caseStudy.deleteMany({ where: { userId } }),
    prisma.lead.deleteMany({ where: { userId } }),
    prisma.campaign.deleteMany({ where: { userId } }),
  ])

  // 3. Define Playbook-specific presets
  const presets: Record<string, {
    vertical: string
    platformFocus: string
    sourceQuery: string
    caseStudy: {
      clientName: string
      industry: string
      challenge: string
      solution: string
      results: string
      testimonialQuote: string
      metrics: any
    }
    proposalPackage: {
      name: string
      description: string
      price: number
      currency: string
    }
    leads: { name: string; company: string; email: string; website: string; phone?: string }[]
  }> = {
    social_media: {
      vertical: "dentists",
      platformFocus: "Instagram",
      sourceQuery: "dentists in Manchester",
      caseStudy: {
        clientName: "BrightSmile Dental",
        industry: "Healthcare / Dental",
        challenge: "BrightSmile Dental had less than 200 followers on Instagram and zero patient bookings from social media.",
        solution: "We implemented an Instagram Growth strategy creating 15 local Reels and running geo-targeted engagement campaigns.",
        results: "Followers increased by 1,200% in 90 days. Generated 24 high-value implant consultations directly from Instagram DMs.",
        testimonialQuote: "Agnelix completely transformed our social presence. We now get daily patient enquiries from Instagram.",
        metrics: [{ label: "New Consultations", value: "24" }, { label: "Follower Growth", value: "+1,200%" }]
      },
      proposalPackage: {
        name: "Instagram Growth Package",
        description: "30 posts + 15 reels + community management monthly",
        price: 1200,
        currency: "GBP"
      },
      leads: [
        { name: "Sarah Connor", company: "Apex Dental Care", email: "sarah@apexdental.co.uk", website: "apexdental.co.uk" },
        { name: "John Miller", company: "Riverside Orthodontics", email: "john@riversideortho.co.uk", website: "riversideortho.co.uk" },
        { name: "Richard Green", company: "Dr. Green's Dental Clinic", email: "richard@drgreensurgery.co.uk", website: "drgreensurgery.co.uk" },
        { name: "Emma Watson", company: "Smile Design Studio", email: "emma@smiledesign.co.uk", website: "smiledesign.co.uk" },
        { name: "David Beckham", company: "Manchester Dental Group", email: "david@manchesterdental.co.uk", website: "manchesterdental.co.uk" }
      ]
    },
    seo: {
      vertical: "law firms",
      platformFocus: "Google Search",
      sourceQuery: "family lawyers Birmingham",
      caseStudy: {
        clientName: "Oakwood Family Law",
        industry: "Legal Services",
        challenge: "Oakwood Law was stuck on Page 3 of Google for high-intent keywords like 'divorce solicitor Birmingham'.",
        solution: "Conducted a technical SEO audit, optimized Google Business Profile, and built local niche citations.",
        results: "Reached #1 for main local keywords. Organic phone calls increased by 84% in 4 months.",
        testimonialQuote: "Our phone hasn't stopped ringing since they took over our SEO. Incredible ROI.",
        metrics: [{ label: "Call Volume", value: "+84%" }, { label: "GBP Views", value: "+120%" }]
      },
      proposalPackage: {
        name: "Local SEO Domination",
        description: "Keyword research, technical fixes, and Google Business Profile optimization",
        price: 950,
        currency: "GBP"
      },
      leads: [
        { name: "Sarah Connor", company: "Birmingham Legal Group", email: "sarah@birminghamlegal.co.uk", website: "birminghamlegal.co.uk" },
        { name: "John Miller", company: "Midland Family Law", email: "john@midlandfamilylaw.co.uk", website: "midlandfamilylaw.co.uk" },
        { name: "Richard Green", company: "Carrington Solicitors", email: "richard@carringtonsolicitors.co.uk", website: "carringtonsolicitors.co.uk" },
        { name: "Emma Watson", company: "Elite Law Chambers", email: "emma@elitelaw.co.uk", website: "elitelaw.co.uk" },
        { name: "David Beckham", company: "West Midlands Partners", email: "david@westmidlandspartners.co.uk", website: "westmidlandspartners.co.uk" }
      ]
    },
    ppc: {
      vertical: "HVAC contractors",
      platformFocus: "Google Ads",
      sourceQuery: "HVAC repair Leeds",
      caseStudy: {
        clientName: "AirPro Heating & Cooling",
        industry: "Home Services",
        challenge: "AirPro was spending £3,000/mo on Google Ads with high cost-per-lead and poor conversion rates.",
        solution: "Redesigned landing pages, optimized negative keywords list, and introduced Local Services Ads.",
        results: "Reduced Cost-Per-Lead by 58% and doubled conversion rate, generating 48 new booked service calls per month.",
        testimonialQuote: "They halved our ad spend costs while doubling our leads. We couldn't ask for a better partner.",
        metrics: [{ label: "Cost per Lead", value: "-58%" }, { label: "Booked Calls", value: "+48/mo" }]
      },
      proposalPackage: {
        name: "Meta Lead Gen Funnel",
        description: "Creative design, ad management, and automated SMS follow-up setup",
        price: 1500,
        currency: "GBP"
      },
      leads: [
        { name: "Sarah Connor", company: "West Yorkshire Heating", email: "sarah@westyorkshireheating.co.uk", website: "westyorkshireheating.co.uk" },
        { name: "John Miller", company: "Leeds Climate Control", email: "john@leedsclimate.co.uk", website: "leedsclimate.co.uk" },
        { name: "Richard Green", company: "Northern Gas & Air", email: "richard@northerngas.co.uk", website: "northerngas.co.uk" },
        { name: "Emma Watson", company: "Rapid Boiler Repair", email: "emma@rapidboiler.co.uk", website: "rapidboiler.co.uk" },
        { name: "David Beckham", company: "Leeds HVAC Pros", email: "david@leedshvacpros.co.uk", website: "leedshvacpros.co.uk" }
      ]
    },
    sales: {
      vertical: "recruitment agencies",
      platformFocus: "Cold Email",
      sourceQuery: "tech recruitment agencies London",
      caseStudy: {
        clientName: "Vertex Talent",
        industry: "Staffing & Recruitment",
        challenge: "Vertex Talent was relying on cold calling with less than 2% connection rate to hiring managers.",
        solution: "Built a cold email outbound campaign targeting VPs of Engineering with personalized case study hooks.",
        results: "Booked 18 qualified sales meetings in the first 30 days. Closed 3 new agency retainers worth £45,000.",
        testimonialQuote: "Outbound automated prospecting changed our recruitment business. Vertex Talent is now fully booked.",
        metrics: [{ label: "Meetings Booked", value: "18" }, { label: "Retainer Revenue", value: "£45,000" }]
      },
      proposalPackage: {
        name: "Outbound Lead Gen Autopilot",
        description: "Custom database building, scriptwriting, and email inbox management",
        price: 2000,
        currency: "GBP"
      },
      leads: [
        { name: "Sarah Connor", company: "NextGen Staffing", email: "sarah@nextgenstaffing.co.uk", website: "nextgenstaffing.co.uk" },
        { name: "John Miller", company: "Global Tech Search", email: "john@globaltechsearch.co.uk", website: "globaltechsearch.co.uk" },
        { name: "Richard Green", company: "Apex Executive Recruitment", email: "richard@apexexec.co.uk", website: "apexexec.co.uk" },
        { name: "Emma Watson", company: "DevPartners UK", email: "emma@devpartners.co.uk", website: "devpartners.co.uk" },
        { name: "David Beckham", company: "London Tech Recruitment", email: "david@londontechrec.co.uk", website: "londontechrec.co.uk" }
      ]
    },
    finance: {
      vertical: "digital agencies",
      platformFocus: "Xero",
      sourceQuery: "digital agencies Bristol",
      caseStudy: {
        clientName: "Focal Agency",
        industry: "Professional Services / Creative",
        challenge: "Focal Agency was doing £100k/mo in sales but had zero visibility into cashflow runway and profit margins.",
        solution: "Built a cashflow forecaster, renegotiated software overheads, and optimized team utilisation ratios.",
        results: "Increased net margins from 8% to 22% and extended cash runway from 15 days to 6 months.",
        testimonialQuote: "Having CFO advisory gave us the confidence to hire key staff and scale profit, not just revenue.",
        metrics: [{ label: "Net Profit Margin", value: "22%" }, { label: "Cash Runway", value: "6 Months" }]
      },
      proposalPackage: {
        name: "Fractional CFO Advisory",
        description: "Weekly cashflow management, tax planning, and monthly board meetings",
        price: 3000,
        currency: "GBP"
      },
      leads: [
        { name: "Sarah Connor", company: "Bristol Media Group", email: "sarah@bristolmedia.co.uk", website: "bristolmedia.co.uk" },
        { name: "John Miller", company: "Shift Digital Bristol", email: "john@shiftdigital.co.uk", website: "shiftdigital.co.uk" },
        { name: "Richard Green", company: "Blueberry Design Studios", email: "richard@blueberrydesign.co.uk", website: "blueberrydesign.co.uk" },
        { name: "Emma Watson", company: "Horizon Creative", email: "emma@horizoncreative.co.uk", website: "horizoncreative.co.uk" },
        { name: "David Beckham", company: "Avon Digital Agency", email: "david@avondigital.co.uk", website: "avondigital.co.uk" }
      ]
    },
    web_design: {
      vertical: "medical spas",
      platformFocus: "Webflow",
      sourceQuery: "med spas Edinburgh",
      caseStudy: {
        clientName: "Aura Aesthetics",
        industry: "Wellness & Beauty",
        challenge: "Aura's website was slow, not mobile-friendly, and booking conversion rate was under 1.2%.",
        solution: "Designed a beautiful, fast Webflow website integrated directly with their booking software.",
        results: "Decreased page load time by 75%. Online bookings increased by 140% in the first 30 days.",
        testimonialQuote: "The new website is absolutely stunning and has already paid for itself multiple times over.",
        metrics: [{ label: "Booking Increase", value: "+140%" }, { label: "Load Time", value: "-75%" }]
      },
      proposalPackage: {
        name: "Custom Webflow Website",
        description: "5 pages + responsive design + on-page SEO + custom CMS configuration",
        price: 3500,
        currency: "GBP"
      },
      leads: [
        { name: "Sarah Connor", company: "Edinburgh Laser Clinic", email: "sarah@edinburghlaser.co.uk", website: "edinburghlaser.co.uk" },
        { name: "John Miller", company: "Royal Mile MedSpa", email: "john@royalmilemedspa.co.uk", website: "royalmilemedspa.co.uk" },
        { name: "Richard Green", company: "St. Andrews Skincare", email: "richard@standrewsskincare.co.uk", website: "standrewsskincare.co.uk" },
        { name: "Emma Watson", company: "Lothian Wellness Hub", email: "emma@lothianwellness.co.uk", website: "lothianwellness.co.uk" },
        { name: "David Beckham", company: "Edinburgh Aesthetics Center", email: "david@edin aesthetics.co.uk", website: "edinaesthetics.co.uk" }
      ]
    }
  }

  const p = presets[playbookType] || presets.sales

  // 4. Create Case Study
  await prisma.caseStudy.create({
    data: {
      userId,
      clientName: p.caseStudy.clientName,
      industry: p.caseStudy.industry,
      challenge: p.caseStudy.challenge,
      solution: p.caseStudy.solution,
      results: p.caseStudy.results,
      testimonialQuote: p.caseStudy.testimonialQuote,
      metrics: p.caseStudy.metrics,
      nicheTags: [p.vertical],
      usageCount: 1,
      aiSummary: `Case study showcasing outbound ROI for ${p.caseStudy.clientName} in the ${p.caseStudy.industry} sector.`
    }
  })

  // 5. Create Sequence
  const sequence = await prisma.sequence.create({
    data: {
      userId,
      name: `Q2 Outbound [${playbookType.toUpperCase()}]`,
      isDefault: true,
      steps: {
        createMany: {
          data: [
            {
              stepNumber: 1,
              delayDays: 0,
              stepType: "EMAIL",
              subjectTemplate: `Quick question for {{company}} regarding ${p.platformFocus}`,
              bodyTemplate: `Hi {{firstName}},\n\nI was reviewing local ${p.vertical} and noticed some huge gaps in {{company}}'s ${p.platformFocus} setup.\n\nWe recently helped ${p.caseStudy.clientName} fix this, achieving: ${p.caseStudy.results.split(".")[0]}.\n\nWould you be open to a quick speed review of {{company}}?`,
              aiPrompt: "Write a short cold email pitching our core services."
            },
            {
              stepNumber: 2,
              delayDays: 3,
              stepType: "LINKEDIN_CONNECT",
              subjectTemplate: "LinkedIn Connect",
              bodyTemplate: `Hi {{firstName}}, saw your profile and loved your work at {{company}}. Let's connect!`,
              aiPrompt: "A friendly connection request."
            },
            {
              stepNumber: 3,
              delayDays: 7,
              stepType: "WAIT",
              subjectTemplate: "Wait period",
              bodyTemplate: null,
              aiPrompt: null
            }
          ]
        }
      }
    },
    include: { steps: true }
  })

  // 6. Create Campaign
  const campaign = await prisma.campaign.create({
    data: {
      userId,
      name: `Active Outreach - ${p.vertical.toUpperCase()}`,
      status: "ACTIVE",
      sequenceId: sequence.id,
      playbookType,
      targetVertical: p.vertical,
      platformFocus: p.platformFocus,
      workflowStage: "LIVE",
      totalLeads: 5,
      emailsSent: 6,
      emailsOpened: 4,
      replies: 1,
      meetings: 1,
      revenueAttributed: 3500
    }
  })

  // 7. Seed Leads
  const leadsData = []
  for (let i = 0; i < p.leads.length; i++) {
    const mock = p.leads[i]
    let status = "NEW"
    let dealValue = 0

    // Assign status variations
    if (i === 0) {
      status = "WON"
      dealValue = 3500
    } else if (i === 1) {
      status = "REPLIED"
    } else if (i === 2) {
      status = "PROPOSAL_SENT"
      dealValue = p.proposalPackage.price
    } else if (i === 3) {
      status = "CONTACTED"
    } else {
      status = "NEW"
    }

    const lead = await prisma.lead.create({
      data: {
        userId,
        email: mock.email,
        firstName: mock.name.split(" ")[0],
        lastName: mock.name.split(" ")[1],
        company: mock.company,
        website: mock.website,
        title: "Founder / Director",
        status: status as any,
        dealValue: dealValue || null,
        platformFocus: p.platformFocus,
        sourceQuery: p.sourceQuery,
        icebreaker: `Hi ${mock.name.split(" ")[0]}, noticed your site ${mock.website} has excellent service positioning, but lacks optimized conversions.`,
        researchNotes: `Local ${p.vertical} based in the UK. Operating with a medium-scale service team. Website audit shows room for improvement in ${p.platformFocus}.`,
        campaignLeads: {
          create: {
            campaignId: campaign.id,
            campaignStatus: status === "NEW" ? "PENDING" : status === "CONTACTED" ? "SENT" : "READY"
          }
        }
      }
    })
    leadsData.push({ lead, status })
  }

  // 8. Add Activities, Emails, Proposals and Portals to seeded leads
  for (const { lead, status } of leadsData) {
    if (status === "WON") {
      // Seed activity logs and closed deal info
      await prisma.activity.createMany({
        data: [
          { leadId: lead.id, type: "EMAIL_SENT", note: `Sent Outbound Step 1 regarding ${p.platformFocus}` },
          { leadId: lead.id, type: "REPLY_RECEIVED", note: "Replied positively: 'Let's schedule a call to see how this works.'" },
          { leadId: lead.id, type: "MEETING_BOOKED", note: "Meeting booked via Calendar Integration link" },
          { leadId: lead.id, type: "DEAL_WON", note: `Deal Closed: Attributed £3,500 CRM contract value` }
        ]
      })
      await prisma.email.create({
        data: {
          leadId: lead.id,
          subject: `Quick question for ${lead.company} regarding ${p.platformFocus}`,
          body: `Hi ${lead.firstName},\n\nI was reviewing local ${p.vertical}...`,
          status: "SENT",
          stepNumber: 1,
          campaignId: campaign.id,
          sentAt: new Date(Date.now() - 15 * 86400000)
        }
      })
    } else if (status === "REPLIED") {
      // Seed Reply thread
      const email = await prisma.email.create({
        data: {
          leadId: lead.id,
          subject: `Quick question for ${lead.company} regarding ${p.platformFocus}`,
          body: `Hi ${lead.firstName},\n\nI was reviewing local ${p.vertical}...`,
          status: "SENT",
          stepNumber: 1,
          campaignId: campaign.id,
          sentAt: new Date(Date.now() - 5 * 86400000)
        }
      })

      const reply = await prisma.reply.create({
        data: {
          leadId: lead.id,
          emailId: email.id,
          fromEmail: lead.email,
          body: "Hi, thanks for reaching out. Yes, we'd be open to seeing a free audit or overview. Do you have availability on Thursday?",
          intent: "MEETING_REQUEST",
          status: "RECEIVED",
          receivedAt: new Date(Date.now() - 4 * 86400000)
        }
      })

      // Seed pending AI auto-draft reply action
      await prisma.pendingAction.create({
        data: {
          userId,
          leadId: lead.id,
          replyId: reply.id,
          type: "SEND_REPLY",
          intent: "MEETING_REQUEST",
          draftSubject: `Re: ${email.subject}`,
          draftBody: `Hi ${lead.firstName},\n\nGreat to hear! I would be delighted to run a custom audit for ${lead.company}.\n\nThursday at 2:00 PM works perfectly. You can choose a slot directly on my calendar: https://calendly.com/demo-agency\n\nLooking forward to speaking!`,
          status: "PENDING",
          riskLevel: "LOW",
          confidence: "HIGH",
          metadata: { reasoning: "Lead requested a meeting availability; automatically drafted calendar booking reply." },
          expiresAt: new Date(Date.now() + 1 * 86400000)
        }
      })

      await prisma.activity.createMany({
        data: [
          { leadId: lead.id, type: "EMAIL_SENT", note: "Sent initial sequence email." },
          { leadId: lead.id, type: "REPLY_RECEIVED", note: "Reply detected: requested meeting availability." }
        ]
      })
    } else if (status === "PROPOSAL_SENT") {
      // Seed Proposal
      await prisma.proposal.create({
        data: {
          userId,
          leadId: lead.id,
          campaignId: campaign.id,
          title: `Proposal: B2B Growth Strategy for ${lead.company}`,
          contentJson: {
            executiveSummary: `We propose launching the ${p.proposalPackage.name} for ${lead.company} to address critical conversion issues.`,
            deliverables: [p.proposalPackage.description, "Weekly reporting dashboards", "Dedicated account strategist"],
            terms: "Net 15 monthly billing"
          },
          executiveSummary: `Automated campaign proposal tailored for ${lead.company}.`,
          pricingPackages: [
            { name: p.proposalPackage.name, price: p.proposalPackage.price, details: p.proposalPackage.description }
          ],
          totalValue: p.proposalPackage.price,
          status: "SENT",
          sentAt: new Date(Date.now() - 2 * 86400000)
        }
      })

      await prisma.activity.create({
        data: {
          leadId: lead.id,
          type: "STAGE_CHANGED",
          note: "Proposal generated and sent to prospect."
        }
      })
    } else if (status === "CONTACTED") {
      await prisma.email.create({
        data: {
          leadId: lead.id,
          subject: `Quick question for ${lead.company} regarding ${p.platformFocus}`,
          body: `Hi ${lead.firstName},\n\nI was reviewing local ${p.vertical}...`,
          status: "SENT",
          stepNumber: 1,
          campaignId: campaign.id,
          sentAt: new Date(Date.now() - 1 * 86400000)
        }
      })
      await prisma.activity.create({
        data: {
          leadId: lead.id,
          type: "EMAIL_SENT",
          note: "Outreach email sent."
        }
      })
    }
  }

  // 9. Create Client Portal
  await prisma.clientPortal.create({
    data: {
      userId,
      campaignId: campaign.id,
      logoUrl: null,
      brandColor: "#7c3aed",
      accessUrl: `portal-${userId.slice(0, 5)}`,
      accessToken: "demo-token",
      enabledSections: ["outbox_stats", "inbox_replies", "meetings_booked_list"],
      isActive: true,
      customSections: []
    }
  })

  // 10. Create Client Report
  await prisma.clientReport.create({
    data: {
      userId,
      campaignId: campaign.id,
      periodStart: new Date(Date.now() - 30 * 86400000),
      periodEnd: new Date(),
      metricsJson: { sent: 45, opened: 28, replies: 6, meetings: 2 },
      aiNarrative: `Our ${playbookType} campaign targeting local ${p.vertical} has yielded excellent initial metrics: 28 opens and 6 positive replies. 2 consultation meetings have been successfully scheduled.`,
      status: "SENT",
      sentAt: new Date()
    }
  })

  return NextResponse.json({ success: true, playbookType })
}
