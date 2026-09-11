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

## Player profiles

This version includes self-service player profiles.

Before deploying it, run `player-profiles-migration.sql` in Supabase SQL Editor.

Then create one Supabase Auth user per player and link that user's UUID to the matching row in `public.players`, for example:

```sql
update public.players
set user_id = 'AUTH-USER-UUID-HERE'
where name = 'Adam England';
```

Players can then sign in through the existing Admin/Profile login, edit only their own nickname, bio, walk-on song and avatar, while the SPL admin retains league-management access.

Avatar images are stored in the public `player-avatars` Supabase Storage bucket and are restricted so authenticated users can only write inside their own UUID folder.

## Simple player login

The public site now asks players to select their name and enter a password. Internally,
Supabase still authenticates using a synthetic `@spl.internal` identifier, but players
never need to know or enter it.

Use `player-login-setup.sql` as the account setup guide. Create each account in
Supabase Authentication, auto-confirm it, give it a password, then link its User UID
to the matching `public.players.user_id`.

Do not enable email-based password recovery for these synthetic accounts; Adam/admin
can reset a player's password from Supabase Authentication if required.


## Auth separation / public profiles

This version separates the two login paths:

- Normal players: Players > Player Login > name + issued password.
- Adam/admin: Admin > original admin email/password OR Continue with Google.
- Adam's existing Auth UUID can still be linked to the Adam England player row, so one identity is both admin and player without using the faux player login.
- Player profile cards are public to everyone.
- Profile edits go through `update_own_player_profile`, which only updates nickname, bio, walk-on song and avatar for the currently authenticated player's own linked row.

Run `profile-auth-security-fix.sql` in Supabase SQL Editor before deploying this version.


## Clickable public player profiles

Player cards now open dedicated public profile pages showing:
- avatar
- nickname
- bio
- walk-on song
- played / won / lost / leg difference
- season average
- highest match average
- five most recent completed results

Players can still edit only their own profile through Player Login. Admin authentication remains separate under Admin.
