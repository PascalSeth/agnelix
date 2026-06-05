import os
import sys

try:
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.lib import colors
    from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.pdfgen import canvas
except ImportError:
    print("reportlab is required. Installing it now...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "reportlab"])
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.lib import colors
    from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to draw page numbers in the foreground at the very end
    without interfering with flowables or backgrounds.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_number(self, page_count):
        self.saveState()
        text_muted = colors.HexColor("#9ca3af")
        self.setFillColor(text_muted)
        self.setFont("Helvetica", 9)
        page_num_str = f"Slide {self._pageNumber} of {page_count}"
        self.drawRightString(752, 40, page_num_str)
        self.restoreState()


def draw_background(canvas, doc):
    """
    Draws the background slide template BEFORE any flowables (text/tables) 
    are rendered, ensuring content stays fully visible.
    """
    canvas.saveState()
    
    bg_color = colors.HexColor("#090d16")
    primary_color = colors.HexColor("#3b82f6")
    text_muted = colors.HexColor("#9ca3af")
    
    # 1. Background Rectangle
    canvas.setFillColor(bg_color)
    canvas.rect(0, 0, 792, 612, fill=True, stroke=False)
    
    # 2. Glowing Borders / Grid Lines
    canvas.setStrokeColor(colors.HexColor("#1e293b"))
    canvas.setLineWidth(1)
    canvas.line(40, 520, 752, 520) # Top boundary line
    canvas.line(40, 60, 752, 60)   # Bottom boundary line
    
    # 3. Header branding
    canvas.setFillColor(colors.HexColor("#ffffff"))
    canvas.setFont("Helvetica-Bold", 20)
    canvas.drawString(40, 540, "Agnelix")
    
    canvas.setFillColor(primary_color)
    canvas.circle(120, 547, 4, fill=True, stroke=False) # Branding dot
    
    canvas.setFillColor(text_muted)
    canvas.setFont("Helvetica", 10)
    canvas.drawRightString(752, 545, "INVESTOR SEED PRESENTATION")
    
    # 4. Confidential footer text
    canvas.setFillColor(text_muted)
    canvas.setFont("Helvetica", 9)
    canvas.drawString(40, 40, "CONFIDENTIAL  |  Agnelix Inc. 2026")
    
    canvas.restoreState()


def create_pitch_deck():
    base_name = "Agnelix_Pitch_Deck"
    pdf_path = f"{base_name}.pdf"
    
    # Elegant fallback if the PDF file is locked by a reader
    suffix = 1
    while True:
        try:
            # Test if we can open the file for writing
            with open(pdf_path, 'ab') as f:
                pass
            break
        except PermissionError:
            pdf_path = f"{base_name}_v{suffix}.pdf"
            suffix += 1
            if suffix > 20: # fail-safe limit
                break
                
    # BaseDocTemplate allows custom page templates with background callbacks
    doc = BaseDocTemplate(pdf_path, pagesize=landscape(letter))
    
    # Define layout frame boundaries (fit content perfectly inside header/footer limits)
    # x=40, y=80, width=712, height=432
    frame = Frame(40, 80, 712, 432, id='normal_frame', 
                  leftPadding=0, rightPadding=0, topPadding=15, bottomPadding=15)
    
    # Create the template and assign background callback
    template = PageTemplate(id='pitch_template', frames=frame, onPage=draw_background)
    doc.addPageTemplates([template])
    
    styles = getSampleStyleSheet()
    
    # Define beautiful custom styles
    title_style = ParagraphStyle(
        'SlideTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=28,
        leading=34,
        textColor=colors.HexColor("#ffffff"),
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'SlideSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#9ca3af"),
        spaceAfter=25
    )
    
    body_style = ParagraphStyle(
        'SlideBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=16,
        textColor=colors.HexColor("#d1d5db"),
        spaceAfter=10
    )

    bold_body_style = ParagraphStyle(
        'SlideBoldBody',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    card_title_style = ParagraphStyle(
        'CardTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#60a5fa"),
        spaceAfter=6
    )

    card_text_style = ParagraphStyle(
        'CardText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#9ca3af")
    )
    
    story = []
    
    # ---------------------------------------------------------
    # Slide 1: Cover Slide
    # ---------------------------------------------------------
    story.append(Spacer(1, 40))
    story.append(Paragraph("<font size=42 color='#ffffff'><b>The Autonomous</b></font>", title_style))
    story.append(Paragraph("<font size=42 color='#3b82f6'><b>AI Growth Engine</b></font>", title_style))
    story.append(Paragraph("<font size=32 color='#ffffff'><b>For Marketing Agencies</b></font>", title_style))
    story.append(Spacer(1, 20))
    story.append(Paragraph("Agnelix orchestrates multi-agent systems that scan buying triggers, enrich decision-makers, and execute highly targeted outreach on autopilot.", body_style))
    story.append(Spacer(1, 30))
    
    bullets_data = [
        [
            Paragraph("<b>FOUNDER-LED ENGINE</b><br/><font color='#9ca3af'>Engineered for scale & performance</font>", card_title_style),
            Paragraph("<b>SEED ROUND</b><br/><font color='#9ca3af'>Targeting GTM expansion & tech moat</font>", card_title_style)
        ]
    ]
    t = Table(bullets_data, colWidths=[350, 350])
    t.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t)
    story.append(PageBreak())
    
    # ---------------------------------------------------------
    # Slide 2: The Problem
    # ---------------------------------------------------------
    story.append(Paragraph("The Prospecting Bottleneck", title_style))
    story.append(Paragraph("B2B lead generation is highly manual, inefficient, and facing unprecedented compliance risk.", subtitle_style))
    
    problem_data = [
        [
            Paragraph("<b>1. Manual Time Drain</b>", card_title_style),
            Paragraph("<b>2. Stale Static Lists</b>", card_title_style),
            Paragraph("<b>3. Blacklisted Domains</b>", card_title_style)
        ],
        [
            Paragraph("Agencies spend 70% of outbound sales time manually searching, profiling websites, and auditing local indicators.", card_text_style),
            Paragraph("Traditional data vendors sell static, outdated database lists with zero buying signals, resulting in poor reply rates.", card_text_style),
            Paragraph("Unpersonalized templates sent from key domains trigger strict modern spam filters, burning valuable domain reputations.", card_text_style)
        ]
    ]
    ptable = Table(problem_data, colWidths=[230, 230, 230])
    ptable.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#111827")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1f2937")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#1f2937")),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 15),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(ptable)
    story.append(Spacer(1, 50))
    story.append(Paragraph("<font color='#ef4444'><b>Critical Impact:</b></font> Outbound acquisition cost is skyrocketing while effectiveness is dropping, causing high agency churn.", body_style))
    story.append(PageBreak())

    # ---------------------------------------------------------
    # Slide 3: The Solution
    # ---------------------------------------------------------
    story.append(Paragraph("The Autonomous Growth Solution", title_style))
    story.append(Paragraph("Agnelix replaces human SDR workflows with a state-machine based agent system.", subtitle_style))
    
    sol_data = [
        [
            Paragraph("<b>⚡ Live Trigger Capture</b>", card_title_style),
            Paragraph("<b>🤖 Multi-Agent Triad</b>", card_title_style),
            Paragraph("<b>📊 Hard ROI Attribution</b>", card_title_style)
        ],
        [
            Paragraph("We scan review drops, new locations, SEO drops, and hiring listings to capture companies with immediate intent.", card_text_style),
            Paragraph("Scout, Profiler, and Closer agents work dynamically in loops to build target profiles and personalized hooks.", card_text_style),
            Paragraph("Syncing all emails and Calendly bookings directly back to closed deals to demonstrate verified, undeniable ROI.", card_text_style)
        ]
    ]
    stable = Table(sol_data, colWidths=[230, 230, 230])
    stable.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#111827")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#10b981")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#1f2937")),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 15),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(stable)
    story.append(Spacer(1, 50))
    story.append(Paragraph("<font color='#10b981'><b>Result:</b></font> 12x lower outbound customer acquisition cost (CAC) and 24/7 autonomous deal booking.", body_style))
    story.append(PageBreak())

    # ---------------------------------------------------------
    # Slide 4: Core Product Modules
    # ---------------------------------------------------------
    story.append(Paragraph("The 6 Core Micro-Engines", title_style))
    story.append(Paragraph("Six proprietary engines operating in sync under a unified platform architecture.", subtitle_style))
    
    mod_data = [
        [
            Paragraph("<b>1. Signal Intelligence</b><br/><font color='#9ca3af'>Monitors Google Maps API, Job listings, and BuiltWith to catch intent signals.</font>", card_title_style),
            Paragraph("<b>2. Dynamic Scoring</b><br/><font color='#9ca3af'>Aggregates signals, recency, and fit into a dynamic predictive intent score (0-100).</font>", card_title_style),
            Paragraph("<b>3. AI Outreach Agent</b><br/><font color='#9ca3af'>Writes personalized copy, handles OOO buffers, and counters sales objections automatically.</font>", card_title_style)
        ],
        [
            Paragraph("<b>4. ROI Analytics</b><br/><font color='#9ca3af'>Calculates multi-touch attribution (first, middle, and last touch) to credit closed revenue.</font>", card_title_style),
            Paragraph("<b>5. Compliance Layer</b><br/><font color='#9ca3af'>Auto-scrubs Do-Not-Call registries, enforces local quiet hours, and logs GDPR compliance.</font>", card_title_style),
            Paragraph("<b>6. Agency Admin</b><br/><font color='#9ca3af'>Multi-tenant White-labeled management layer so agencies can instantly resell to sub-clients.</font>", card_title_style)
        ]
    ]
    mtable = Table(mod_data, colWidths=[230, 230, 230])
    mtable.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#111827")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#1f2937")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1f2937")),
        ('TOPPADDING', (0,0), (-1,-1), 12),
        ('BOTTOMPADDING', (0,0), (-1,-1), 12),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(mtable)
    story.append(PageBreak())

    # ---------------------------------------------------------
    # Slide 5: The Agent Workflow (LangGraph Detail)
    # ---------------------------------------------------------
    story.append(Paragraph("Autonomous Agent Triad (LangGraph)", title_style))
    story.append(Paragraph("How specialized agents work together inside a state-machine based error fallback loop.", subtitle_style))
    
    agent_cols = [
        [
            Paragraph("<font color='#3b82f6'><b>AGENT 1: THE SCOUT</b></font>", card_title_style),
            Spacer(1, 10),
            Paragraph("• Monitors trigger events<br/>• Scrapes Google Maps profiles<br/>• Identifies bad reviews / hiring indicators<br/>• Feeds raw leads to state graph", body_style)
        ],
        [
            Paragraph("<font color='#6366f1'><b>AGENT 2: THE PROFILER</b></font>", card_title_style),
            Spacer(1, 10),
            Paragraph("• Queries Apollo.io & LinkedIn APIs<br/>• Finds owner or manager contact details<br/>• Verifies email with ZeroBounce<br/>• Performs jurisdiction & GDPR analysis", body_style)
        ],
        [
            Paragraph("<font color='#10b981'><b>AGENT 3: THE CLOSER</b></font>", card_title_style),
            Spacer(1, 10),
            Paragraph("• Drafts highly personalized cold copy<br/>• Pushes sequence steps dynamically<br/>• Classifies replies & counters objections<br/>• Directly books Calendly meetings", body_style)
        ]
    ]
    
    atable = Table(agent_cols, colWidths=[230, 230, 230])
    atable.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#111827")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1f2937")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#1f2937")),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 15),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(atable)
    story.append(Spacer(1, 40))
    story.append(Paragraph("<b>The Moat:</b> Traditional systems rely on linear sequencing. Agnelix agents self-correct (e.g., if Closer fails, state redirects Profiler to find an alternative contact).", body_style))
    story.append(PageBreak())

    # ---------------------------------------------------------
    # Slide 6: Market Opportunity (TAM)
    # ---------------------------------------------------------
    story.append(Paragraph("Market Opportunity & Audience", title_style))
    story.append(Paragraph("B2B outbound prospecting is transitioning completely to autonomous intelligence agents.", subtitle_style))
    
    market_metrics = [
        [
            Paragraph("<font size=36 color='#3b82f6'><b>120,000+</b></font><br/><b>Global Marketing Agencies</b>", title_style),
            Paragraph("<font size=36 color='#10b981'><b>$15.2 Billion</b></font><br/><b>Total Addressable Software Market</b>", title_style)
        ],
        [
            Paragraph("Digital agencies are high-value distributors. A single agency onboarding represents 10 to 50 local business sub-accounts, creating a high leverage expansion mechanism.", body_style),
            Paragraph("Agencies are already paying thousands of dollars for separate scraping tools, email warmup tools, databases, and SDR reps. Agnelix bundles the entire stack into a single autonomous product.", body_style)
        ]
    ]
    
    mtable = Table(market_metrics, colWidths=[350, 350])
    mtable.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 20),
    ]))
    story.append(mtable)
    story.append(PageBreak())

    # ---------------------------------------------------------
    # Slide 7: Business Model & Monetization
    # ---------------------------------------------------------
    story.append(Paragraph("Hybrid Monetization Engine", title_style))
    story.append(Paragraph("Aligning product pricing directly with agency ROI results in massive LTV and expansion margins.", subtitle_style))
    
    model_data = [
        [
            Paragraph("<b>1. Multi-Tier SaaS</b>", card_title_style),
            Paragraph("<b>2. Performance Booking</b>", card_title_style),
            Paragraph("<b>3. Integrated Revenue Share</b>", card_title_style)
        ],
        [
            Paragraph("<font color='#ffffff'><b>$97 – $2,997 / mo</b></font><br/><br/>Monthly subscription tiers based on the number of active pipelines, leads enriched, and organization sub-accounts.", card_text_style),
            Paragraph("<font color='#ffffff'><b>+$150 – $500 / meeting</b></font><br/><br/>Value-aligned performance fee charged for every qualified meeting booked directly in the client's calendar.", card_text_style),
            Paragraph("<font color='#ffffff'><b>5% – 10% Closed Value</b></font><br/><br/>Commission share collected from deals closed using native CRM pipeline sync integrations.", card_text_style)
        ]
    ]
    
    modeltable = Table(model_data, colWidths=[230, 230, 230])
    modeltable.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#111827")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1f2937")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#1f2937")),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 15),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(modeltable)
    story.append(PageBreak())

    # ---------------------------------------------------------
    # Slide 8: Competitive Advantage
    # ---------------------------------------------------------
    story.append(Paragraph("Competitive Advantage Matrix", title_style))
    story.append(Paragraph("How Agnelix bypasses and outperforms traditional database competitors.", subtitle_style))
    
    comp_matrix = [
        ["Dimension", "Agnelix Autonomous Loop", "Traditional CRM / Lists (e.g. Apollo)"],
        [
            Paragraph("<b>Lead Source</b>", bold_body_style),
            Paragraph("<font color='#10b981'><b>Real-time trigger monitors</b> (bad review, job posting, location open)</font>", body_style),
            Paragraph("Static scrapers & stale databases", body_style)
        ],
        [
            Paragraph("<b>Personalization</b>", bold_body_style),
            Paragraph("<font color='#10b981'><b>Hyper-personalized icebreakers</b> generated per trigger signal</font>", body_style),
            Paragraph("Static custom tags / templated mail-merges", body_style)
        ],
        [
            Paragraph("<b>Deliverability</b>", bold_body_style),
            Paragraph("<font color='#10b981'><b>Automated warmup domains</b> and strict compliance quarantine filters</font>", body_style),
            Paragraph("Cold domain spamming with zero validation filters", body_style)
        ],
        [
            Paragraph("<b>Attribution</b>", bold_body_style),
            Paragraph("<font color='#10b981'><b>Built-in closed-loop analytics</b> to map spend directly to wins</font>", body_style),
            Paragraph("Relies entirely on manual third-party CRM setup", body_style)
        ]
    ]
    
    ctable = Table(comp_matrix, colWidths=[120, 320, 270])
    ctable.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1e293b")),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#111827")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1f2937")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#1f2937")),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ]))
    story.append(ctable)
    story.append(PageBreak())

    # ---------------------------------------------------------
    # Slide 9: Go-To-Market (GTM)
    # ---------------------------------------------------------
    story.append(Paragraph("GTM & Exponential Distribution", title_style))
    story.append(Paragraph("Reaching $100K MRR inside 12 months with low-friction organic loops.", subtitle_style))
    
    gtm_channels = [
        [
            Paragraph("<b>1. White-Label Viral Loop</b>", card_title_style),
            Paragraph("Agencies deploy our software under their own brand to provide value to their client portfolios. Every onboarded agency naturally acts as a distributor of our software.", card_text_style)
        ],
        [
            Paragraph("<b>2. CRM & App Integrations</b>", card_title_style),
            Paragraph("Publishing direct integrations into GoHighLevel (GHL), HubSpot, and Salesforce marketplaces, listing our engine where agencies already operate.", card_text_style)
        ],
        [
            Paragraph("<b>3. Dogfooding Outreach</b>", card_title_style),
            Paragraph("We demonstrate value by using our own Scout-Profiler-Closer agents to discover target agencies, warm them, and book pitch meetings autonomously.", card_text_style)
        ]
    ]
    
    gtable = Table(gtm_channels, colWidths=[230, 230, 230])
    gtable.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#111827")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1f2937")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#1f2937")),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 15),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(gtable)
    story.append(PageBreak())

    # ---------------------------------------------------------
    # Slide 10: Financial Projections
    # ---------------------------------------------------------
    story.append(Paragraph("Financial Projections & Economics", title_style))
    story.append(Paragraph("Highly scalable model with strong unit economics and short payback cycles.", subtitle_style))
    
    fin_cols = [
        [
            Paragraph("<b>Target MRR Model (24-Month Projection)</b>", card_title_style),
            Spacer(1, 10),
            Paragraph("• <b>Month 6 MRR:</b> $25,000<br/>• <b>Month 12 MRR:</b> $120,000<br/>• <b>Month 24 MRR:</b> $600,000<br/>• <b>Projected Gross Margin:</b> 84%", body_style)
        ],
        [
            Paragraph("<b>Core SaaS Unit Economics</b>", card_title_style),
            Spacer(1, 10),
            Paragraph("• <b>LTV : CAC Ratio:</b> 5.5x<br/>• <b>Payback Period:</b> 21 Days<br/>• <b>Monthly Churn (Target):</b> &lt; 2.5%<br/>• <b>Average ACV (Agency):</b> $4,200", body_style)
        ]
    ]
    
    ftable = Table(fin_cols, colWidths=[350, 350])
    ftable.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#111827")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1f2937")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#1f2937")),
        ('TOPPADDING', (0,0), (-1,-1), 15),
        ('BOTTOMPADDING', (0,0), (-1,-1), 15),
        ('LEFTPADDING', (0,0), (-1,-1), 15),
        ('RIGHTPADDING', (0,0), (-1,-1), 15),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(ftable)
    story.append(PageBreak())

    # ---------------------------------------------------------
    # Slide 11: The Ask & Milestones
    # ---------------------------------------------------------
    story.append(Paragraph("The Seed Ask & Milestones", title_style))
    story.append(Paragraph("Accelerating development of the agentic framework and executing GTM channels.", subtitle_style))
    
    ask_cols = [
        [
            Paragraph("<b>Seed Allocation Focus</b>", card_title_style),
            Spacer(1, 10),
            Paragraph("• <b>55% Engineering & Scrapers:</b> Scaled LangGraph agent orchestration framework and integration engines.<br/>• <b>30% GTM & Marketing:</b> Direct organic and performance-based marketing agency customer acquisition.<br/>• <b>15% Operations & Legal:</b> General overhead and advanced local quiet hours compliance models.", body_style)
        ],
        [
            Paragraph("<font size=32 color='#3b82f6'><b>$1.5 Million</b></font><br/><b>SEED ROUND CAPITAL</b>", title_style),
            Spacer(1, 20),
            Paragraph("Let's build the autonomous outbound prospecting layer together.", body_style)
        ]
    ]
    
    asktable = Table(ask_cols, colWidths=[400, 300])
    asktable.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#111827")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#1f2937")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#1f2937")),
        ('TOPPADDING', (0,0), (-1,-1), 20),
        ('BOTTOMPADDING', (0,0), (-1,-1), 20),
        ('LEFTPADDING', (0,0), (-1,-1), 20),
        ('RIGHTPADDING', (0,0), (-1,-1), 20),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(asktable)
    
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Pitch deck successfully compiled as {pdf_path}")

if __name__ == "__main__":
    create_pitch_deck()
