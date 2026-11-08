# SPL calendar colours update

## Install
1. Extract this ZIP.
2. Open adzengland/Selby-Premier-League on GitHub, main branch.
3. At the repository root, choose Add file > Upload files. Drag in the availability folder from inside website. Replace only availability/availability.js and availability/availability.css.
4. Commit and wait for your normal Cloudflare Pages deployment to finish.
5. Hard refresh (Ctrl+F5), sign in and open Availability.

No SQL required for this colour update. Existing responses, permissions, fixtures and scoring are unchanged. The original availability database setup must already be installed.

## Colours
- Any explicit unavailable response: red, regardless of other responses.
- At least one available and nobody unavailable: soft green.
- All ten available: stronger green with bright yellow border.
- No responses: neutral.
- Selected date: separate white outline.

Counts and player lists remain visible. Existing Refresh/save/month navigation behaviour is unchanged.

## Checks and rollback
Check known available and unavailable dates and mobile layout. Restore these two files from GitHub history to roll back; no database rollback is needed.

Preview: http://127.0.0.1:8789/?v=hues2#availability
No preview adapters or sample data are included. Package prepared, not automatically published.

Baseline: b170215db87fa25cdd58c891b5f310acd4eaa181
