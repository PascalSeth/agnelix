# Agency Settings UI Redesign (`/settings/agency`)

## Overview
The Agency Settings page has been completely redesigned into a high-performance **Command Center** for agency branding, flagship offer architecture, outbox SMTP authentication, and deliverability monitoring.

---

## Key Features & Improvements

### 1. 🌟 Hero Command Header & Health Checklist
* **Hero Banner**: Frosted glass hero header with live status indicators and instant **Save Settings** button with unsaved change pulse indicators.
* **4-Card Setup Checklist**:
  * **1. Identity**: Brand logo, agency name, sender position & polished bio.
  * **2. Flagship Offer**: Core transformation & deliverable used by the autonomous prospecting engine.
  * **3. Outbox (SMTP)**: Gmail / Google Workspace authentication state.
  * **4. Booking Link**: Calendly / Cal.com integration for automated meeting tracking.

---

### 2. 🗂️ Curated 4-Tab Workspace Architecture

#### Tab 1: Agency Brand & Bio
* **Interactive Brand Logo Uploader**: Instant image upload with avatar fallback preview.
* **Agency & Sender Identity**: Editable agency name and job title with **`✨ AI Refine`**.
* **Calendar Integration**: Full URL validation, auto-protocol formatting, and a **`🔗 Test Booking Link`** external link.
* **Company Description**: Textarea with **`✨ AI Polish`** and a live **Cold Email Context Preview** card (`"…I work with Acme — we help..."`).
* **Tone & Currency Selectors**: Custom dropdowns for tone and primary operating currency (`USD`, `EUR`, `GBP`, `CAD`, `GHS`, `NGN`).

#### Tab 2: Flagship Offer & Autonomous ICP
* **Flagship Offer Name**: Core program title (e.g. *Cosmetic Clinic Patient Acquisition Engine*).
* **Core Transformation**: Quantified client outcome (e.g. *Add $40k–$80k/mo in new private patient revenue*).
* **Key Deliverable**: Fulfillment mechanism (e.g. *Done-for-you localized outreach + automated qualification*).
* **`✨ AI Generate Offer` Button**: Automatically architects an offer based on your company description in 1 click!
* **Primary Playbook Specialization**: Connects directly to default objection-handling templates.

#### Tab 3: Outbox & Gmail SMTP Setup
* **Visual 3-Step Setup Guide**: Direct external links to Google Security Settings and App Passwords.
* **16-Character App Password**: Monospace formatted input with **Show/Hide** toggle.
* **`🧪 Test Connection`**: Verifies SMTP handshake on `smtp.gmail.com:465`.
* **`📤 Send Test Email to Me`**: Dispatches a live test email directly to the sender to prove inbox deliverability immediately.
* **Collapsible Help**: Explains why Google App Passwords are required.

#### Tab 4: DNS & Spam Shield
* **Copyable DNS Records**: SPF, DKIM, DMARC, and Secondary Domain guidance with 1-click clipboard copy for Host and TXT value.
* **Spam Prevention Diagnostic Tool**: Interactive diagnostic tabs for:
  * Emails landing in spam
  * Bounced / rejected messages
  * Low open rates (< 25%)
  * 4-Week volume ramp schedule table.
