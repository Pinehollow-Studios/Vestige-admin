
- **2026-08-18** — **Ranking axis built** (`/vestige-index` → "Ranking
  import"). Three published top-100s as independent votes — Top100GolfCourses,
  Golf Empire, Today's Golfer (200) — stored as typed constants in
  `lib/ranking-import/`; NCG skipped (only 25 of 100 render). Rank → concave
  sub-score (#1→100 … #200→73, floor 73 so being ranked can't drag a course
  below unranked), plain average across sources, **best rank wins** within a
  club (catalogue is one row per club; sources rank individual courses).
  Matching reuses `curated-import/match.ts` and applies **only** auto-confidence
  matches — trial run: 393/400 rows, 185 courses, 7 genuine ambiguities
  reported not guessed. Never overwrites hand-edits (`Ranking ·` prefix on
  `score_source`); writes via `setCoursesScores` passing age+setting through so
  the set-explicit RPC can't clear them. New `IndexGuide` panel explains all
  three axes to Jack (which he sets, Age bands, rank→score, Setting rubric).
  Verified `tsc`/`eslint`/`build`; **not applied to prod yet** — preview→apply
  is a deliberate gate. Long-form in `CHANGELOG.md`.
