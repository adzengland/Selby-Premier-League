# Selby Premier League

**TEN PLAYERS. NINE ROUNDS.**

**WELCOME TO THE HOME OF AVERAGE DARTS.**

The home of the Selby Premier League: fixtures, results, player profiles, league statistics, news and three playable darts minigames. Built for following the league and scoring match nights on desktop, tablet and mobile.

🎯 **[Visit the SPL website](https://selby-premier-league.pages.dev/)**

## The league

- 10 players, 9 rounds and 45 scheduled matches.
- Everyone plays everyone once, with 5 matches per round.
- Matches are first to 5 legs, playing 501 with a double-out finish.
- Standings are ordered by **legs for**, then **leg difference**.
- Completed scorer results feed the fixtures, league table and player statistics.

## What's on the site

### Fixtures and match scoring

Public fixtures and completed match summaries sit alongside an admin-only match scorer.

- Bull-off selection determines who starts.
- Touch-friendly dartboard input records individual darts and remaining scores.
- Checkout suggestions update as darts are entered.
- Last Dart supports correcting entries and returning to earlier visits.
- Busts, double-outs and leg wins are handled by the scorer.
- Spoken score calls, checkout requirements and leg/match announcements support match nights.
- Player walk-on audio can be played before starting a match.
- Admin match-score deletion removes the recorded result and updates derived standings.

Submitted visits are saved through Supabase. League results are derived from recorded scoring, rather than manually overriding final leg totals.

### Players and statistics

- Public player profiles combine photos, nicknames, bios and statistics on one page.
- Match summaries and charts show performance across the league.
- Stats include averages, darts thrown, finishing performance and leg records.
- Homepage totals track 180s, 26s and trips to the Madhouse across completed league matches.
- Player cards and fixture avatars link to profiles.
- Admins can edit player profiles and upload walk-on MP3s; visitors can play uploaded tracks.

Checkout-attempt statistics are inferred from scorer data. They are estimates where a player's intended target cannot be known from the recorded dart alone.

### News and league history

- Public News posts with titles, body text, timestamps, images and YouTube links.
- Admin-only publishing and image uploads.
- A latest-news card on the homepage.
- An About page documenting the league's story through photos and video.

## Minigames

All three games support local **Practice Mode** without signing in, plus authenticated competition using existing SPL player accounts.

| Game | Challenge | Competitive ranking |
| --- | --- | --- |
| **501 Sprint** | Finish 501 on a double | Fewest darts, then fastest time |
| **Around the Clock** | Hit 1–20, then outer bull and inner bull | Fastest completion time |
| **Checkout Challenge** | Complete random checkouts before time runs out | Number of successful checkouts |

Around the Clock doubles and trebles advance you faster, but jumps stop at outer bull: both bulls must still be completed.

Checkout Challenge starts with 60 seconds and adds 20 seconds per successful checkout. Difficulty increases as you progress. An impossible finish with the remaining darts resets the visit; a bust ends the run.

### Controls

- **Desktop:** WASD or arrow keys to aim; hold and release Space to throw.
- **Mobile/tablet:** directional controls to aim; hold and release THROW for power.
- Short presses give fine aiming adjustments; holding a direction accelerates movement.
- Throwing power, wobble and bounce-outs are part of the challenge.

Practice gameplay stays in the browser and does not create Supabase gameplay records or submit leaderboard results. Competitive play uses authenticated server-side validation. Result images are generated locally as PNGs, with sharing or download depending on browser support.

## How it's built

The frontend is static **HTML, CSS and vanilla JavaScript**, hosted on **Cloudflare Pages**. There is no frontend framework or build step required.

**Supabase** provides authentication, PostgreSQL data, media storage and database functions. Row Level Security and server-side checks enforce access to writes and competitive results.

```text
GitHub → Cloudflare Pages → Static website
                                  ↕
                         Supabase Auth, database and storage
```

The site keeps animation and interface updates local. Walk-on audio loads on demand, News images are compressed, and the minigame leaderboard system retains personal bests alongside the state needed for active games and retry protection. League scoring history is retained for corrections and statistics.

## Repository layout

```text
about/          League history page
assets/         Shared branding and media
checkout/       Checkout Challenge
clock/          Around the Clock
database/       SQL files included in the repository
home/           Homepage features
news/           News feed and administration
profiles/       Player hub, editing and walk-on media
scorer/         Match scorer, board input and caller sounds
shared/         Shared minigame controls, practice logic and result cards
sprint/         501 Sprint
stats/          Public league and player statistics
index.html      Main site shell
app.js          Core league application
styles.css      Main stylesheet
navigation.*    Site navigation
account.css     Account styling
config.js       Browser-safe Supabase configuration
```

## Running locally

1. Download or clone this repository.
2. Keep the existing `config.js`. For a separate installation, use `config.example.js` as the template.
3. Serve the repository root with a static HTTP server. For example, if Python is installed:

   ```sh
   python -m http.server 8000
   ```

4. Open [localhost:8000](http://localhost:8000/).

**A local frontend using the live Supabase configuration still accesses the live database.** Use a separate test project or an explicitly isolated preview build for test scoring and admin changes. Running on localhost does not automatically create a sandbox.

## Updating the live website

1. Back up the current repository and review the update's installation instructions.
2. If the release includes a database migration, apply only that release's required SQL to the existing Supabase project and run its verification checks.
3. Upload or merge the supplied website files into their matching paths in this repository. For a package containing `website/`, upload its **contents**, not the enclosing folder.
4. Preserve existing configuration, assets and files not replaced by the release.
5. Commit to the branch connected to the existing Cloudflare Pages project and wait for deployment to succeed.
6. Check the changed pages on desktop and mobile, including signed-out and authorised views where relevant.

Keep the existing working Cloudflare build settings. Static frontend updates do not require a new backend service.

### Database installation notes

This repository has evolved through incremental releases. SQL files and older installation documents may describe individual releases rather than a complete current installation.

**Do not run every SQL file or rerun `schema.sql` as a routine update.** Use the instructions supplied with the specific release being installed. A fresh Supabase project requires the complete applicable migration sequence; copying the frontend alone does not create its database functions or permissions.

## Access and security

| Visitor | Access |
| --- | --- |
| Public | League pages, published News, player profiles, match summaries, statistics, public media and Practice Mode |
| Signed-in player | Public features, permitted own-profile updates and competitive minigames |
| Authorised admin | Scoring, corrections, match-score deletion, News management and player/media administration |

The browser configuration contains the Supabase project URL and a public browser key. Never commit service-role keys, database passwords or other private credentials.

Hiding an admin button is not the security boundary: database permissions, RLS and authorised functions enforce access. Preserve those checks when changing the frontend.

---

Built for the SPL. Established 2025.
