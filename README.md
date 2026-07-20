# SimplBudget Website

Official marketing site for [simplbudget.com](https://www.simplbudget.com).

Reflects **Build 102 RC1** product messaging: Available Margin, Financial Standing, Cash Forecast, Planning, Activity, and Ask SimplBudget.

## Waitlist

The waitlist form posts to the Supabase Edge Function `waitlist-signup`
(`config.js` → `https://qlirjdbmxetmzjefgfrg.supabase.co/functions/v1/waitlist-signup`).

Legacy `/api/waitlist` remains as a Vercel fallback but is not used by the live form.

### Collects

- First name
- Last name
- Email
- Privacy consent timestamp

### Storage

Rows land in Supabase table `public.waitlist` (service role inside the edge function).

### Notification

On successful insert, Resend emails **info@simplbudget.com** when these Supabase secrets are set:

| Secret | Description |
|---|---|
| `RESEND_API_KEY` | Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender, e.g. `SimplBudget <noreply@simplbudget.com>` |
| `WAITLIST_NOTIFY_EMAIL` | Optional; defaults to `info@simplbudget.com` |

### Required for capture

None beyond the deployed edge function + `waitlist` table (service role is already available to Edge Functions).


## Local development

Open `index.html` for static review. Waitlist API needs `vercel dev` plus the env vars above, and the `waitlist` migration applied.

## Deployment

Hosted on Vercel. Push to `main` in this website repo triggers production deploy.

```bash
git push origin main
```
