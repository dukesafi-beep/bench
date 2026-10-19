# ALTIGRA Visibility Checker v2

Netlify deploys `main` from `dukesafi-beep/bench`. No package installation is needed. Node 22 runs the tests before publication. The root index remains the ALTIGRA landing page; `/visibility-check.html` opens the automatic checker. `/manual-check.html` preserves the manual checklist.

## Working without credentials

Public HTTPS website scans and comparisons work with no third-party API key. The scanner checks initial HTML, robots.txt and sitemap.xml. It reports evidence, unknown checks, timestamps and its measurement limitations. Reports can be downloaded as JSON or printed to PDF. When server email is not configured, the contact button opens a mail draft for the visitor to send.

## Optional Gemini discovery sample

Set these in Netlify project environment variables, scoped to Functions and Production, then redeploy:

- `GEMINI_API_KEY`: a Gemini API key. Never put keys in HTML, JavaScript, GitHub or reports.
- `ENABLE_AI_VISIBILITY`: `true` to explicitly enable metered AI sampling.
- `GEMINI_MODEL`: optional; defaults to `gemini-3.8-flash`.

The sample sends only service and city in the prompt. It does not tell Gemini the target business. The backend checks whether the exact business name appears in the answer and returns the full answer, prompt, model, date, grounding sources and search suggestions. Review identity matches manually. Failed or unconfigured requests have no visibility score. This is one Gemini API answer, not the Gemini consumer app, ChatGPT, Google Maps, AI Overviews or Google organic rankings. Grounding usage may incur Google API charges; set provider quotas before enabling production usage. No paid API calls were used for deployment tests.

## Optional report delivery

Set `SENDGRID_API_KEY` and `FROM_EMAIL` (a verified SendGrid sender), then redeploy. Reports go only to `info@altigra.be` and `safi@altigra.be`. The UI detects configuration automatically. A successful API response is provider acceptance, not proof of inbox delivery. Verify receipt separately.

## Security and limits

- Only HTTPS public hostnames using standard ports; credentials and literal IPs are rejected.
- IPv4 DNS answers are checked; private/special ranges are rejected. Each request pins a validated address. Redirects are validated again. IPv6-only sites are not supported.
- Maximum 1.5 MB response, four redirects, per-request timeouts, bounded input, per-IP throttling and short-lived bounded in-process caching.
- Netlify code rate limits are declared for audit and email functions. Verify rate-limit validation in each deploy log. Per-instance throttling is an additional fallback, not an absolute global spend cap.
- No browser-side API keys. Remote HTML is inspected as text; never executed. Source links allow HTTP/HTTPS only. Google-provided search suggestions render in a sandboxed iframe.
- Scans cannot render JavaScript, authenticate to third-party sites, measure Core Web Vitals, confirm indexing, inspect all crawl rules or quantify backlink authority.
- Do not make the project public until you have reviewed provider quotas and the intended use.

## Validation

`node --test audit.test.js` covers URL/IP validation, evidence parsing, HTTP validation, unavailable Gemini behavior, DNS pinning/private redirects, and mocked email provider failures. Provider mocks never send email or consume AI quota.

