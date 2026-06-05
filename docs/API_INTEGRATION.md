# Agnelix: API Integration Guide
**Core Infrastructure Connections**

The engine's accuracy depends on these data pipelines.

## 1. Data & Signal APIs

### Google Maps (Serper.dev)
*   **Purpose**: Local business discovery and review sentiment analysis.
*   **Key Endpoint**: `/maps-search`
*   **Signal to Track**: Average rating < 4.0 or recent 1-star reviews.

### Apollo.io
*   **Purpose**: Professional contact data enrichment.
*   **Key Endpoint**: `/v1/people/match`
*   **Requirement**: You need an API Key with "Enrichment" credits.

### BuiltWith
*   **Purpose**: Technical debt detection.
*   **Signal to Track**: Missing `fb-pixel`, `google-ads`, or `seo-plugins`.

## 2. Communication APIs

### SendGrid / Postmark
*   **Purpose**: Transactional and sequence-based cold email.
*   **Setup**: Must configure **DKIM/SPF** records to ensure high deliverability.

### Twilio
*   **Purpose**: Automated SMS follow-ups for high-value leads.
*   **Use Case**: Send a text 2 hours after an email is opened.

## 3. Environment Variables (.env.local)
```bash
OPENAI_API_KEY=
SERPER_API_KEY=
APOLLO_API_KEY=
SENDGRID_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```
