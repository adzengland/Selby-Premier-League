# Around the Clock production release checks

- New SQL applied twice in local PGlite/PostgreSQL without depending on 501 SQL.
- Anonymous start denied; unlinked player denied; authenticated direct private-table access denied; cross-player throws denied; malformed input denied.
- 100 actual scoring-coordinate comparisons match the measured original dartboard scorer.
- 60 labelled number/multiplier fixtures and six bull-stage fixtures test single/double/treble progress, ceiling at outer bull, wrong bulls, bouncer, and final inner-bull completion. These fixtures substitute only the impact label; production score_at is restored afterward.
- Real low-power misses tested: no advance, darts consumed, three-dart collection and duplicate collection/retry behaviour.
- First accepted dart timing, charge/rate guard and saved completion time checked.
- Time-only best-per-player ranking verified with a faster 40-dart run beating a slower 9-dart run; equal times with different darts share rank.
- Production files exercised through the real Supabase browser client with mocked network responses: signed-out gate, clock RPC calls, target, time, finish/rank, leaderboard link and replay. No local adapters loaded or browser errors.
- Earlier local prototype tests cover a complete game and four phone viewports. Production live deployment/database were not modified.
