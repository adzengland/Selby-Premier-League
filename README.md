# 🎯 Selby Premier League

The official website and darts platform for the **Selby Premier League**.

What started as a simple league table has got slightly out of hand.

The platform now combines league management, player profiles, statistics, live scoring tools and competitive darts games in one responsive web app.

## 🌐 Live Site

https://selby-premier-league.pages.dev/

Hosted on **Cloudflare Pages**, with **Supabase** providing authentication, database storage, security and server-side game logic.

---

## 🏆 The League

The Selby Premier League consists of:

- 10 players
- 9 rounds
- Everyone plays everyone once
- 5 matches per round
- 45 matches per season
- First to 5 legs
- League position determined by leg difference
- Exact final ties may be settled by playoff

### Match statistics

Each match records:

- Result
- Legs won / lost
- Leg difference
- Player match averages

Season statistics are calculated automatically from completed fixtures.

---

## 🎯 Platform Features

### League

The main SPL site provides:

- Fixtures and round schedule
- League table
- Player profiles
- Match results
- Season averages
- Highest match averages
- Recent player form
- League statistics
- Head-to-head data

League data is stored centrally in Supabase and public pages update from the live database.

### Player Accounts

Players have individual SPL accounts linked to their player record.

Players can:

- Sign in using their name and issued password
- Maintain their own public profile
- Upload a profile image
- Set a nickname
- Add a bio
- Set a walk-on song
- Access authenticated SPL games

Player authentication uses Supabase Auth. Internal synthetic identifiers are hidden from the player-facing login experience.

### Administration

League administration is separate from normal player authentication.

Administrators can manage fixtures, round dates, hosts, match results, player averages and league data.

Administrative write access is controlled through Supabase rather than being trusted to the browser.

---

# 🕹️ Game Modes

## 501 Sprint

A single-player speed challenge starting from 501.

The objective is simple:

**Check out 501 in as few darts as possible.**

Rules include:

- Standard dartboard scoring
- Three-dart visits
- Proper bust rules
- Double-out finish
- Bullseye counts as double 25
- Wire bouncers
- Power-based throwing
- Player-controlled aiming
- Persistent authenticated results

The leaderboard ranks each player's best performance by:

1. Fewest darts
2. Fastest completion time

Game scoring and timing are validated server-side.

## Checkout Challenge

A single-player finishing challenge built around one of the most important parts of darts: **getting out**.

Players are given checkout targets and must find and hit a valid finishing route using standard darts checkout rules.

The challenge adds another competitive SPL game mode alongside 501 Sprint and Around the Clock, with authenticated results and leaderboard performance tied back to the player's SPL identity.

---

## Around the Clock

A speed-based Around the Clock challenge.

Players progress through:

**1 → 20 → Outer Bull → Inner Bull**

Multipliers accelerate progress:

- Single = advance 1
- Double = advance 2
- Treble = advance 3

The leaderboard is based purely on the player's fastest completion time.

Dart count is recorded for statistics but is not used as a tiebreak.

## 🎯 Darts Engine

The games share a browser-based darts simulation featuring:

- Real dartboard geometry
- Single / double / treble detection
- Outer and inner bull detection
- Wire / bounce-out behaviour
- Power-controlled throws
- Aim movement and natural wobble
- Three-dart visits
- Desktop keyboard controls
- Mobile controls
- Sound and visual effects

Authoritative scoring is handled through Supabase database functions rather than accepting a final score supplied by the browser.

This reduces casual score manipulation, although the games are not intended to provide bot-proof competitive anti-cheat.

---

# 📊 Statistics

The statistics area expands the league beyond the basic standings.

The platform is designed to support statistics including:

- Player records
- Match averages
- Highest averages
- Leg performance
- Head-to-head records
- Recent form
- Game leaderboards
- Historical SPL performance

Additional statistics and visualisations will continue to be added as the league generates more match data.

---

# 🧱 Project Structure

```text
/
├── assets/          Shared site artwork and media
├── checkout/        Checkout Challenge game
├── clock/           Around the Clock game
├── database/        Supabase SQL installation and verification
├── scorer/          Darts scoring functionality
├── shared/          Shared game/site components
├── sprint/          501 Sprint
├── stats/           League statistics
│
├── index.html       Main application shell
├── app.js           Core league application
├── styles.css       Main site styling
├── navigation.js    Shared navigation
├── navigation.css   Navigation styling
├── account.css      Player/account interface
├── config.js        Public Supabase configuration
└── schema.sql       Core league database schema
```

---

# 🗄️ Technology

The SPL deliberately uses a lightweight architecture.

### Frontend

- HTML
- CSS
- Vanilla JavaScript

There is no frontend framework or build pipeline required.

### Backend

**Supabase** provides:

- PostgreSQL database
- Authentication
- Row Level Security
- Storage
- RPC/database functions
- Game validation
- Persistent leaderboards

### Hosting

**Cloudflare Pages**

The production site deploys directly from this GitHub repository. Commits to the configured production branch are automatically deployed.

---

# 🔐 Security Model

The public Supabase publishable key is intentionally available to the browser.

The application must never contain:

- Supabase service-role keys
- Supabase secret keys
- Database passwords
- Private credentials

Database permissions and Row Level Security remain the security boundary.

Game data uses private schemas for internal game/shot state, with narrowly scoped public functions providing authenticated access.

Players may only modify their own permitted profile information. Administrative league writes require an authorised administrator.

---

# 🗃️ Database

The project uses PostgreSQL through Supabase.

Core league data includes:

- Players
- Rounds
- Fixtures
- League settings
- Administrators

Game systems maintain separate game and shot records while referencing the existing SPL player identity.

Database changes and game installations are maintained in:

`/database`

Run production migrations using the Supabase SQL Editor with the appropriate administrator/postgres role.

Do not expose private game schemas through the Supabase Data API.

---

# 🚀 Deployment

The site is deployed as a static application through Cloudflare Pages.

No Node.js installation, npm build or server deployment is required.

Typical deployment flow:

**GitHub → Cloudflare Pages → Static SPL frontend → Supabase Auth / PostgreSQL / RPC**

Database migrations should be installed and verified before frontend changes that depend on them are deployed.

See the deployment documentation in the repository for release-specific instructions.

---

# 🧪 Testing

Game releases include checks covering areas such as:

- Authentication
- Player identity
- Private table access
- Cross-player requests
- Dartboard scoring coordinates
- Singles / doubles / trebles
- Bulls
- Bouncers
- Bust behaviour
- Three-dart visits
- Timing
- Retry/idempotency behaviour
- Leaderboard ranking
- Responsive/mobile behaviour

Production behaviour should still be verified after deployment against the live Supabase project and Cloudflare-hosted site.

---

# 🎯 Selby Premier League

Ten Players. Nine rounds. First to five legs.

**Welcome to average darts at it's very best.**
