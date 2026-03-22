# GA4 Measurement Protocol — Event Configuration

## Setup

1. Create a **GA4 property** in Google Analytics.
2. Create a **Measurement Protocol API secret** under:
   Admin → Data Streams → [your stream] → Measurement Protocol API secrets
3. Replace placeholders in `src/content/services/ga4.js`:
   - `G-XXXXXXXXXX` → your Measurement ID
   - `REPLACE_ME`   → your API secret

## Events

### `prompt_sent`
Fired each time the user submits a prompt.

| Parameter  | Type    | Description                          | PII? |
|------------|---------|--------------------------------------|------|
| `tokens`   | integer | Estimated token count                | No   |
| `platform` | string  | `chatgpt` / `gemini` / `claude` etc. | No   |

> **Never included:** prompt text, email, IP address, user agent fingerprint.

## CNIL / GDPR Compliance Notes

- **No JS snippet** — we use the Measurement Protocol `/mp/collect` endpoint only.
  The JS snippet sends the user's **IP address** to Google. The MP endpoint does not.
- **`non_personalized_ads: true`** is always set, disabling remarketing signals.
- **`client_id`** is a random UUID stored in `chrome.storage.local`, regenerated
  on extension install. It is never linked to an email, name, or any real identity.
- **`engagement_time_msec: 0`** prevents session stitching across pages.
- Analytics collection is **disabled by default** and requires explicit opt-in
  (`enableGA4: true` in the extension settings panel).
- Under CNIL guidelines for France, analytics that do not collect IP addresses and
  use anonymous session IDs are exempt from prior consent requirements when
  used solely for audience measurement. This configuration satisfies those criteria.

## Data Retention

Set GA4 data retention to **2 months** (minimum) under:
Admin → Data Settings → Data Retention
