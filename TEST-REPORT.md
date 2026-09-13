# Release verification — 2026-09-13

This package is for the first live installation. No live deployment or live database mutation has been performed.

- Current SQL installation and latest timer migration were exercised in local PGlite/PostgreSQL: 800 power/scoring samples, low-power misses, three-dart visit completion, idempotent retries, rapid-fire rejection, and checkout duration measured from first accepted throw rather than Start Game.
- Current account header checked at 390px and 1280px: account route, player identity, signed-out sign-in form, removed homepage duplicate and layout bounds.
- During this testing iteration, browser checks covered impact anchoring, dart flight and bounce-out, forced animation with reduced-motion preference, audio/mute, reset/replay, first-dart timer, automatic collection, BUST/180/confetti, result GIF, signed-out game hiding and leaderboard navigation. Relevant screenshots were visually inspected.
- Production uses the real shared Supabase client and server RPCs. Practice adapters are excluded. Existing root styles.css, config.js and assets remain dependencies supplied by your current site.
- Final archive entries and local HTML/CSS asset references were verified. Incremental SQL upgrades 003–006 are intentionally excluded; use 000, 001, 002 only.

Live sign-in, actual account/avatar data, score persistence on the production project and physical-phone HTTPS behaviour still need the post-install checks in DEPLOYMENT.md.
