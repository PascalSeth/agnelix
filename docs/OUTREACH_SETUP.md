# Agnelix: Automated Outreach Setup
**Conversion Optimization & Deliverability**

Once leads are found, the engine must "Closer" them through high-conversion sequences.

## 1. Domain & Warmup (Crucial)
*   **Infrastructure**: Do NOT send from your main domain. Buy secondary domains (e.g., `getAgnelix.com`).
*   **Warmup**: Use [Instantly.ai](https://instantly.ai/) or [Mailreach](https://www.mailreach.co/) to "warm" the inbox for 14 days before sending any real emails.
*   **Deliverability Check**: Use `mail-tester.com` to verify your SPF/DKIM records.

## 2. Sequence Logic (The "Dental" Hook)
Standard 4-step sequence for Dental Marketing:

1.  **Day 1 (The Signal)**: "Saw your clinic in [City] just got 3 negative reviews. I have a script to fix this."
2.  **Day 3 (The Social Proof)**: "I did this for [Other Clinic] and they booked 5 implants this month."
3.  **Day 7 (The Audit)**: "Attached a quick loom/audit of your SEO gaps."
4.  **Day 12 (The Breakup)**: "Guessing reputation isn't a priority right now. I'll check back in 6 months."

## 3. Automation Hook
Integrate your `Closer Agent` to automatically trigger this sequence when a lead's `intentScore` > 85.

```typescript
// Pseudocode for sequence trigger
if (lead.intentScore > 85) {
  const emailDraft = await generateEmail(lead.signals);
  await sendGrid.send({
    to: lead.email,
    subject: "Urgent: GMB Sentiment at " + lead.companyName,
    text: emailDraft
  });
}
```
