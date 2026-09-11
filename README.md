# Selby Premier League

The site is now configured for live Supabase data.

## Current live setup

- Supabase project URL is configured in `config.js`
- Public league pages read directly from Supabase
- Admin page uses Supabase email/password authentication
- Only users listed in `admin_users` can write
- Fixtures, hosts, dates, scores and averages are stored centrally
- League standings recalculate automatically

## League rules

- 10 players
- 9 rounds
- Everyone plays everyone once
- 5 matches per round / 45 total
- Each match is first to 5 legs
- League ranked by leg difference
- Exact final tie can be settled by playoff
- Round 1: 24 October 2026, hosted by Bob Wilcockson
- Rounds 2–9: date and host editable

## Before deploying

Make sure your Supabase admin user has been inserted into `public.admin_users`.

Then deploy the whole folder to Cloudflare Pages.

## Cloudflare Pages

1. Create a GitHub repository, e.g. `selby-premier-league`
2. Upload all files from this folder
3. In Cloudflare: Workers & Pages > Create > Pages > Connect to Git
4. Select the repository
5. Build command: leave blank
6. Build output directory: `/`
7. Deploy

The site will receive a free `*.pages.dev` address.

## Security note

The value in `config.js` is a Supabase publishable key, which is intended for browser use. The database password and Supabase service-role/secret keys must never be added to the website.
