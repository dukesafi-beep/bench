# ALTIGRA — Visibility Gap Check

This branch (feature/elevate-services-visibility-check) contains:
- Updated homepage copy with elevated Service Pillars
- A standalone audit application: `visibility-check.html`
- A Netlify serverless function scaffold: `netlify/functions/send-audit.js`

This README explains how to deploy the site and enable the email delivery for the audit reports.

---

## Recommended quick deploy (Netlify)
Netlify is the fastest way to enable the serverless mailer already included in this repo.

1. Create a Netlify site
   - Go to https://app.netlify.com and "New site" → "Import from Git" → select `dukesafi-beep/bench`.
   - Set the publish directory to `/` (this is a static site).

2. Add environment variables
   - Netlify Dashboard → Site settings → Build & deploy → Environment → Environment variables
   - Add these keys:
     - `SENDGRID_API_KEY` = <your SendGrid API key>
     - `FROM_EMAIL` = `info@altigra.be` (or the verified sender in SendGrid)
   - Note: FROM_EMAIL must be a verified sender in your SendGrid account or the send will fail.

3. Deploy
   - Trigger a deploy (Netlify will run an initial build). The serverless function will be deployed under `/.netlify/functions/send-audit`.

4. Test the flow
   - Visit the deployed site URL (from Netlify).
   - Open `/visibility-check.html`.
   - Fill in your business name or URL, complete a few checks and click **Send audit to ALTIGRA**.
   - Confirm receipt at both `info@altigra.be` and `safi@altigra.be`.

---

## If you prefer Vercel
- The same serverless logic can run on Vercel. You will need to adapt `netlify/functions/send-audit.js` to a Vercel serverless handler (or use the provided code with minimal changes) and set environment variables in the Vercel project settings. The frontend endpoint will be `/api/send-audit` on Vercel.

## Formspree (no secrets)
If you do not want to add SendGrid credentials, I can change the client to POST to Formspree or similar. That requires providing a Formspree form ID and has different email formatting/limitations.

---

## LocalStorage one-time submission behavior
- The client implements a one-time submission guard using localStorage under key `vgc-v1-subs`.
- The guard records a normalized business identifier (prefer `meUrl`, fallback to `meName`) with an ISO timestamp after a successful send. This prevents repeated sends from the same browser for the same business.
- Important: localStorage is a UI-side guard only. For robust cross-device duplicate blocking, enable server-side checking (see notes below).

## Server-side duplicate blocking (optional, recommended)
- The Netlify function currently sends emails but does not persist the submission record server-side.
- If you want robust enforcement of one-submission-per-business across devices, add a small persistent store (DynamoDB, Supabase, Netlify KV, or similar) and update the serverless function to check and record the normalized key before sending.

---

## PR details (ready to open)
- Branch: `feature/elevate-services-visibility-check`
- PR title: `feat: elevate services and add Visibility Gap Check audit tool`
- PR description (suggested):
```
This PR elevates the ALTIGRA service messaging and integrates a Visibility Gap Check audit tool.

What changed:
- Updated homepage copy and visual hierarchy (three Service Pillars: Hyper-Local SEO, High-Intent Google Ads, Infrastructure & Tracking)
- Added `visibility-check.html` — interactive audit tool (single-file app)
- Added serverless function scaffold `netlify/functions/send-audit.js` (SendGrid) to email audit reports to info@altigra.be and safi@altigra.be
- Implemented client-side one-time submission guard (localStorage)

Testing checklist:
- [ ] Deploy branch to Netlify and set `SENDGRID_API_KEY` and `FROM_EMAIL`
- [ ] Preview `/visibility-check.html` and run a sample audit
- [ ] Click **Send audit to ALTIGRA** and confirm receipt at both mailboxes
- [ ] Verify localStorage marks the business as submitted and the Send button is disabled after success
- [ ] Confirm no console errors in browser devtools

Notes:
- The Netlify function requires `SENDGRID_API_KEY` and a verified `FROM_EMAIL` in SendGrid. We included a scaffold; replace or extend as needed for your hosting.
```

---

If you want I will now open the PR and include this checklist and a short QA report. If you prefer to run the deploy yourself first, add the environment variables on Netlify and tell me when ready — I will run the test and finish the PR.
