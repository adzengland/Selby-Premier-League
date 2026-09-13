# SPL 501 Sprint — first installation

Release: 2026-09-13 · account12. This guide replaces all earlier deployment notes. Nothing has been deployed or applied to the live database by Codex.

## 1. Before installing

Use SPL-501-Release-2026-09-13.zip. Extract it and open the SPL-501-Deployment folder inside. This is an addition to your existing Selby Premier League website, not a replacement for the entire repository.

Keep a copy of the current GitHub repository (Code → Download ZIP) and note the current commit so you can revert. If index.html or app.js have changed independently since this work began, merge those changes instead of overwriting them: the supplied versions are based on the site snapshot used for this project.

Keep the existing Supabase project, player accounts, styles.css, config.js and root assets folder. No new hosting project, npm install, build system or separate game login is required. Do not upload SPL-Local-Preview, preview-mode.js, preview-score.js, lan-preview.js or local test scores.

## 2. Install the database setup first

Open the Supabase project already used by the website. Open SQL Editor and run each of these files in its own new query, in order, using the project administrator/postgres role. Paste the entire file, not a selected fragment.

1. database/000-preflight.sql — read-only checks. Confirm name, user_id and avatar_url exist on public.players. Each player who should play must show LINKED. The duplicate user_id query must return no rows.
2. database/001-sprint.sql — the complete, current Sprint installation. It includes wire bouncers, current power rules, first-dart timing, private game/shot storage, permissions and leaderboard functions. A successful run may simply say “Success. No rows returned.”
3. database/002-verify.sql — check games and shots have RLS enabled. The four permission values must be false, true, true, false, in the displayed order. An empty leaderboard is expected before anyone finishes a live leg.

If a player is NOT LINKED, find their existing user ID in Supabase Authentication → Users and set that player's public.players.user_id to the matching ID. Do not assign one account to multiple player rows. If an account does not exist, create/invite it through the existing player-account process first. Do not rerun unrelated league/profile migrations.

Do not run old incremental files 003–006 after this installation: 001 already contains their latest combined changes. They are omitted from this release ZIP to avoid installing older rules over the final version.

The setup adds sprint_private.games and sprint_private.shots plus narrowly scoped functions. It reads your existing player links; it does not import preview players or practice scores. Leave sprint_private out of exposed API schemas. The game's functions are in public and enforce the signed-in player identity.

## 3. Add the website files to GitHub

In the existing repository, at the same level as styles.css and config.js:

| Package item | Action |
| --- | --- |
| index.html | Replace the existing root file |
| app.js | Replace the existing root file |
| account.css | Add this new root file |
| sprint/ | Add the entire folder, including assets and vendor subfolders |
| database/, DEPLOYMENT.md, TEST-REPORT.md, ARTWORK-NOTES.txt | Optional to commit as installation/reference files |

Do not upload the enclosing SPL-501-Deployment folder as a nested site folder. Its contents belong at the website root. Do not delete existing files that are absent from the ZIP.

For the GitHub website: open the repository and the intended branch, choose Add file → Upload files, and drag index.html, app.js, account.css and the whole sprint folder from the extracted package. Review the changed paths, then commit. Suggested message: “Install authenticated SPL 501 Sprint and account menu”. If you use a pull request, merge it into the branch connected to Cloudflare Pages when ready to go live.

Retain the existing config.js with SPL_CONFIG.SUPABASE_URL and SPL_CONFIG.SUPABASE_ANON_KEY. Only the public browser key belongs there; never add a service-role key or database password. No new secrets are needed.

Sprint is hidden from signed-out visitors by default. No extra setting is required. Optional: setting SPL_CONFIG.SPRINT_HIDE_SIGNED_OUT to false shows the Sprint entry and login gate to visitors, but never allows anonymous play. Leave the default for the agreed UI.

## 4. Let the existing Cloudflare Pages project deploy

Open Cloudflare → Workers & Pages → the existing Selby Premier League Pages project. Check its connected repository and production branch. Commit/merge to that branch and watch the resulting deployment until it succeeds. Keep the working build settings for this existing static site; this update needs no additional build command or environment variable.

Use the deployment URL Cloudflare reports. Your existing pages.dev routes should be:

- Home: https://selby-premier-league.pages.dev/#home
- Account/sign-in: https://selby-premier-league.pages.dev/#account
- Game (after sign-in): https://selby-premier-league.pages.dev/#sprint

Use your existing custom domain instead if that is the normal website address. Sign in on the same origin on which you play; a preview URL, custom domain and pages.dev address do not share browser login storage. Keep the existing Supabase sign-in/redirect configuration for that domain. No new email-confirmation flow is introduced.

## 5. Verify the installed site

1. Open the live homepage in a private/incognito window. The top-right account control should open sign-in. There should be no separate My Profile button in the home hero and no Sprint navigation when signed out. A direct #sprint visit should show a login prompt, not a playable board.
2. Sign in with an existing linked player. Confirm the top-right name/avatar (initials if there is no photo), account/profile page and Sprint navigation. On narrow phones the account control is an avatar button.
3. Open Sprint and press Start Game on the board. Wait: the clock should remain zero. Release the first dart: the clock begins, including if that dart misses or bounces. The saved clock is measured by the server from the first accepted throw.
4. Check WASD/arrows and SPACE on desktop, D-pad and hold/release THROW on mobile. The gauge bounces Low–High–Low, about 542ms each way, with a 46–54% sweet spot. Below 20% misses and consumes a dart. Long presses should not open copy/paste menus.
5. Check three-dart visits collect automatically about one second after impact. Reset Game immediately starts a fresh 501 leg with a stopped clock; it does not erase previously completed results.
6. Check a bouncer shows a red cross and falls away with wire/floor sounds. A bust restores the visit's starting score, plays the scream and briefly displays red BUST. A 180 visit displays the gold 180 celebration. Full dart animation plays even with device Reduce Motion enabled, as requested. The mute button controls game sounds.
7. Complete a legal double-out. Confirm the Game Shot GIF, confetti, enlarged darts/time/average, overall standing, completion sound, Play Again and View Overall Leaderboard link. Ranking is based on the player's best leg: fewest darts, then fastest time. The completion card's standing is the player's best-result standing, not necessarily the rank of the latest leg.
8. Refresh after completion and confirm the saved result remains. Use a second linked player's account to check identity and separate results. Local review scores will not appear on this live leaderboard.
9. Test your phone in portrait, including account access, scoreboard/clock, board, controls and results. Use the HTTPS live site, not the 192.168 local preview address.

## Troubleshooting

- Old interface: refresh or reopen the site. The release uses versioned scripts/styles. Check Cloudflare deployed the correct branch and that all four required items were uploaded.
- Missing game: sign in through Account. If signed in but blocked, check the player user_id link and preflight results.
- “Sprint database update has not been installed”: confirm 001 ran in the same Supabase project referenced by config.js, then rerun 002. If SQL fails, stop and keep the exact error; do not proceed with a partially installed database.
- Missing styles, artwork or audio: confirm account.css and the entire sprint folder are at the site root. Preserve filenames/case. Audio starts after an interaction and may be muted on the device.
- No photo: confirm the existing player's avatar_url is set and reachable. Initials are the deliberate fallback.
- Lost response: use Retry Last Action. It reuses the request ID so the same dart/result is not counted twice.
- Standing unavailable: use Refresh on the leaderboard. A worse leg does not replace a better personal best.
- Local preview banner or Review as selector on the live site: the wrong folder was uploaded. Replace with this release's production files.

## Rollback

Revert the deployment commit (index.html/app.js/account.css/sprint) in GitHub and allow Cloudflare to redeploy the previous site. Keep the new database tables/functions so completed scores are preserved. Do not drop sprint_private to undo a UI deployment.

## Verification scope

SQL scoring/timing and permissions have local PostgreSQL tests; browser flows and mobile viewports have automated checks. This release has not been tested against your live Supabase database or deployed domain. Follow section 5 after installation. Server scoring prevents direct score submission and enforces player identity, but aim/power can still be automated by a modified client; this is not bot-proof anti-cheat.

Official references: [Supabase SQL functions](https://supabase.com/docs/guides/database/functions), [Cloudflare Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/), [Cloudflare static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/).
