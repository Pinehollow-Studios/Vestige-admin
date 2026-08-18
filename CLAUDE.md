
- **2026-08-18** — **Last four courses ranked + Age bands on screen.**
  Chichester (1990) + Sherdons (1992) sourced properly, so `established` got
  the real year and the curve derived Age; Ashton Court + Lodmoor have no
  findable founding date (the upstream source literally records "built in 0",
  the origin of our junk `2`), so `established` stays null and
  `heritage_score` is hand-set to 45 with a "confirm" `score_source` — a year
  is factual and must not be invented, a score is editorial. **0 of 1,794 now
  unranked.** New collapsible `AgeBands.tsx` in Index mechanics: a nine-era
  table (founding years → Age) whose score column is computed by calling
  `ageFromYear()` so it can't drift from the curve; `AGE_BANDS` holds only the
  labels. Verified `tsc`/`eslint`/`build`. Long-form in `CHANGELOG.md`.
