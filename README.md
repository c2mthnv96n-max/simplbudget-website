# SimplBudget Website

Official marketing site for [simplbudget.com](https://www.simplbudget.com).

Reflects **Build 102 RC1** product messaging: Available Margin, Financial Standing, Cash Forecast, Planning, Activity, and Ask SimplBudget.

## Waitlist

The waitlist form posts to `/api/waitlist` (Vercel serverless).

### Collects

- First name
- Last name
- Email
- Privacy consent timestamp

### Storage

Rows land in Supabase table `public.waitlist` (service role only).

### Notification

On successful insert, Resend emails **info@simplbudget.com**:

- Subject: `New SimplBudget Waitlist Signup`
- Body: Name, Email, Signup Date, Source

### Required Vercel environment variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Production Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) |
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `SimplBudget <noreply@simplbudget.com>` |
| `WAITLIST_NOTIFY_EMAIL` | Optional; defaults to `info@simplbudget.com` |

## Local development

Open `index.html` for static review. Waitlist API needs `vercel dev` plus the env vars above, and the `waitlist` migration applied.

## Deployment

Hosted on Vercel. Push to `main` in this website repo triggers production deploy.

```bash
git push origin main
```
