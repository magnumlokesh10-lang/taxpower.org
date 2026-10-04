# Guided support email setup

The website widget is a guided enquiry assistant, not live chat and not an AI service. It collects Customer/License ID, company, reply email, product, problem and an optional PNG/JPEG screenshot (2 MB maximum), then shows an editable summary.

## Current mode

`js/support-chat-config.js` has an empty endpoint. In this mode **Open email draft** opens the visitor's email application addressed to `info@magnuminfosystem.com`. The visitor must press Send there and attach any screenshot manually. The widget never claims this draft was sent. An installed/configured email application is required. Details stay in memory until the page reloads or Start over is used; they are not put in local storage.

## Enable direct website submission

1. Obtain a Node.js 20+ server/container with HTTPS and an SMTP account allowed to send using the MAIL_FROM address. Static GitHub hosting alone cannot run this backend.
2. In this directory, run `npm install`, copy `.env.example` to `.env`, and fill SMTP credentials, verified sender and exact production origins. Do not commit `.env` or expose credentials in frontend files. Configure SPF/DKIM with the email provider for the sender domain.
3. Run `npm test`, then `npm start` using a process manager. Startup checks the SMTP connection.
4. Reverse-proxy `https://YOUR-API-HOST/api/support-ticket` to `127.0.0.1:8787/api/support-ticket`. Allow JSON requests up to 3 MB. Set TRUST_PROXY=1 only if direct access is blocked and your proxy replaces X-Forwarded-For with the real client IP.
5. In `js/support-chat-config.js`, set `window.TAXPOWER_SUPPORT_ENDPOINT = 'https://YOUR-API-HOST/api/support-ticket';` and bump its cache version in HTML pages.
6. With the mailbox owner's approval, send a controlled test request and confirm the screenshot and Reply-To arrive. Also check browser CORS, failure messages and rate limiting. No live emails were sent during development.

## Processing

Browser summary → HTTPS JSON → server validation and rate limiting → SMTP → Magnum mailbox. The recipient is fixed server-side to `info@magnuminfosystem.com`; visitors cannot choose arbitrary recipients. The sender is the verified site address; Reply-To is the visitor's email. Success means SMTP accepted the message, not guaranteed inbox delivery. The reference number is an email reference, not a database ticket or SLA.

PNG/JPEG signatures, size limits, field lengths, products and reply email are validated. Input is sent as plain text, not executable HTML. Screenshots are attached in memory, not published or written to a public folder. No automatic customer acknowledgment email is sent.

The single-process server remembers request IDs for 24 hours to avoid duplicate sends on retries. State resets on restart. For multiple instances or durable tickets, use Redis/database-backed rate limits and idempotency, plus a ticket table/queue. Add CAPTCHA if public abuse requires it. SMTP failures need operational monitoring. Configure mailbox retention/access for license information and screenshots.

## Required from site owner

- Backend hosting/HTTPS route or current hosting provider details.
- SMTP provider, server, port, username/password and authorized sender address (configure in server secrets).
- Confirmation Magnum can receive website support requests and screenshots at the listed address.
- Whether durable ticket history or a staff dashboard is needed; those are not included in this email-only service.

No WhatsApp integration is added for technical support. Existing demo/purchase backend stays separate.
