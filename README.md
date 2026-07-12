# SimplBudget Website

Official marketing site for [simplbudget.com](https://www.simplbudget.com) — a personal finance forecasting app that helps users answer: **"Know if you're financially okay."**

## Build 79 — Website refresh

This site reflects the current product after Build 78:

- **Available Margin** — lowest projected checking balance over 90 days
- **Financial Standing** — Healthy, Watch, At Risk
- **Cash Forecast** — projected balances over time
- **Planning** — scenario preview ("What happens if I spend $250?")
- **Funding Plans** — goal planning without cash shortages
- **Ask Simpl** — natural-language financial questions

## Waitlist API

The waitlist form posts to `/api/waitlist` (Vercel serverless function).

### Required Vercel environment variables

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | Resend API key for email delivery |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `SimplBudget <welcome@simplbudget.com>` |
| `RESEND_AUDIENCE_ID` | Optional Resend audience ID for contact storage |

Confirmation email:

- **Subject:** Welcome to the SimplBudget Waitlist
- **Body:** Thank you for joining… We'll notify you when early access is available.

## Local development

Static files only — open `index.html` in a browser. The waitlist API requires Vercel deployment (or `vercel dev` with env vars).

## Deployment

Hosted on Vercel. Push to `main` triggers production deploy.

```bash
git push origin main
```
