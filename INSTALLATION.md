# Around the Clock Sprint — installation

Release: 2026-09-13 · clock-release1. This is the production add-on for the SPL website/account layout prepared with 501 Sprint. No live website or database has been changed by Codex.

## What to download

Use SPL-Around-The-Clock-Release-2026-09-13.zip. Extract it and open SPL-Around-The-Clock-Deployment inside. Do not deploy the earlier TEST-ONLY ZIP or the SPL-Around-The-Clock-Local-Test folder.

The add-on contains updated root index.html/app.js/account.css and a new clock folder. It does not contain or overwrite the existing sprint folder. Existing 501 scores and rules are not changed by its SQL.

If 501 Sprint/account UI has not yet been installed, install the previously supplied SPL-501-Release-2026-09-13.zip first, following its guide, then add this release. Around the Clock's database setup is otherwise independent of 501's functions: it only needs the existing players table and linked Supabase accounts.

## 1. Back up and check the current site

Download the current GitHub repository and note its commit. Keep the existing config.js, styles.css, root assets and sprint folder. The root files in this add-on are based on the latest account-menu version from this project. If those files have been independently edited, merge the changes rather than overwriting newer work.

## 2. Install the new database functions

Open the SAME Supabase project used by the website, then SQL Editor. As the project administrator/postgres role, run these entire files separately in order:

1. database/000-preflight.sql — read-only player/account checks. Every player who should play must be LINKED. The duplicate user_id query must return no rows. The players table must have name, user_id and avatar_url.
2. database/001-around-the-clock.sql — installs the complete game, scoring and time-only leaderboard. It creates clock_private.games, clock_private.shots and clock_* functions. A successful execution may report no rows returned.
3. database/002-verify.sql — games and shots should both show RLS enabled. The four permission values should be false, true, true, false. An empty leaderboard is correct before the first completed live game.

If preflight shows an unlinked player, use the existing Authentication user ID for that player's players.user_id. Do not map multiple player rows to one account. Stop if SQL reports an error; save the exact message before proceeding.

Run only these new Around the Clock SQL files for this add-on. Do not rerun old 501 upgrades. Keep clock_private out of exposed API schemas; public clock_* functions provide the intended access. No new service-role key, Edge Function, account system or storage bucket is required.

## 3. Upload to the existing GitHub repository

Upload the CONTENTS at the root, alongside the site's current styles.css and config.js:

| Item | Action |
| --- | --- |
| index.html | Replace with the included version |
| app.js | Replace with the included version |
| account.css | Replace/update with the included version |
| clock/ | Add the entire new folder, including assets and vendor |
| database/, INSTALLATION.md, TEST-REPORT.md, ARTWORK-NOTES.txt | Optional to keep as migration/reference documents |

Do not upload the enclosing SPL-Around-The-Clock-Deployment directory as a nested folder. Keep all existing site files absent from this ZIP, especially sprint/, styles.css, config.js and root assets/.

GitHub web workflow: choose the intended branch, Add file → Upload files, drag the required root files and clock folder, review paths, then commit. Suggested message: “Add Around the Clock Sprint with time leaderboard”. A commit/merge to the Cloudflare production branch can go live immediately, so install SQL first.

The configuration continues using the existing public Supabase URL and browser key. Never put a service-role key or database password in browser code. The account menu and signed-out hiding work for both game links.

## 4. Publish through the existing Cloudflare project

In Cloudflare → Workers & Pages, open the current Selby Premier League Pages project. Confirm its connected repository and production branch. Commit/merge to that branch and wait for the deployment to succeed. Keep the current working build settings; this static add-on needs no new install/build step or environment variable.

New game: https://selby-premier-league.pages.dev/#clock
Existing 501: https://selby-premier-league.pages.dev/#sprint
Account: https://selby-premier-league.pages.dev/#account

Use the normal custom domain instead if applicable. Sign in on the same domain you use for the game. The 192.168 address is for local testing, not deployment.

## 5. Verify both games

- Signed out: neither game is playable; a direct #clock visit shows sign-in. The account control remains available.
- Sign in as an existing linked player. Open Around the Clock from navigation. Confirm the real player identity and no LOCAL PREVIEW banner or Review as selector.
- Start Game: target 1 and stopped clock. Release the first dart: time begins. A wrong target or bouncer uses a dart without advancing.
- Check jumps: T17 → 20, T18/T19/T20 → outer bull (when that number is the current target). D19/D20 → outer bull. Neither bull can be skipped. Inner bull while outer is required does not advance.
- After numbers, hit outer bull (25) then inner bull (50). Confirm completion effects, time, standing, leaderboard link and Play Again.
- Refresh: the live result should remain. Log in as a second player to confirm a separate result and shared leaderboard. Local prototype records are deliberately not imported.
- Verify a faster run wins even with more darts. Equal elapsed milliseconds share rank. Darts are informational, never a tiebreak. The display rounds to tenths of a second; ranking uses stored milliseconds.
- Confirm controls stay compact on desktop and phone; timer, target, board and controls fit during mobile play. Check audio, mute, bounce-out and reset.
- Open 501 Sprint and verify it still plays and retains its own leaderboard.

## Current game rules

1–20 in order, outer bull, inner bull. A single advances one position, a double two, a treble three. Number jumps stop at outer bull. Wrong targets/misses/bouncers never roll progress back. Three-dart visits collect automatically; reset immediately restarts at 1. The gauge goes Low–High in approximately 542ms and reverses, with a 46–54% sweet spot; below 20% falls short. First accepted throw starts the authoritative timer. Collection pauses and subsequent charging count toward completion time.

Each completed game is retained in clock_private. The public leaderboard selects each player's fastest time only, independently of 501. Hit rate counts successful target-matching darts, not bonus positions; best advance is the most positions cleared in one visit. Rank on the result card refers to the player's fastest stored game.

## Troubleshooting and rollback

- Missing clock_* function: verify the new SQL ran in the project referenced by config.js, then rerun verification.
- Signed in but blocked: check players.user_id matches the real auth account exactly once.
- Old UI: reopen/refresh after Cloudflare completes. Confirm the right branch and files were deployed.
- Missing styles/audio/images: confirm account.css and the full clock folder were uploaded with original names/case.
- Retry Last Action reuses its request ID to avoid duplicate darts/results.
- A page refresh does not resume an unfinished game; start another. Completed results persist.
- To roll back, revert this add-on's GitHub commit and let Cloudflare redeploy. Leave clock_private tables/functions in place to preserve results. Do not delete 501 data or its sprint folder.

## Test scope and limits

Local PostgreSQL tests cover permissions, current rules, geometry, timing, retries, visits and ranking. Production-browser checks use the real Supabase client with simulated network responses; local-prototype mobile tests cover gameplay. Real production sign-in, persistence and phone behaviour still need the checks above. Server scoring checks identity and calculates results, but browser aim/power can still be automated; this is not bot-proof anti-cheat.

Official references: https://supabase.com/docs/guides/database/functions and https://developers.cloudflare.com/pages/configuration/git-integration/.
