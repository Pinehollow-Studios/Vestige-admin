
- **2026-08-18** — **Index calibration**: the best courses now read 99. Three
  fixes after the first blend put Royal St George's at 88 and Sunningdale at
  #85 — (1) Setting's inland bias corrected (heathland/downland baselines up,
  **road-intrusion penalty dropped**: a trunk road behind a treeline isn't an
  intrusion), (2) **ranking leads at 0.55** (age 0.15 / setting 0.30) since the
  185 ranked courses carry real consensus, (3) a **frozen calibration curve** on
  the blend's output + an **unranked ceiling of 88**, via iOS migration
  `20260818100000_vestige_index_calibration.sql` (`create or replace`, signature
  unchanged, expand/contract-safe; rollback-probed; applied dev + prod, both
  ledgers repaired). Scale now 20-99, median 50, 18 courses in the 90s; RSG
  99 (#1), Sunningdale 95 (#7). Long-form in `CHANGELOG.md`.
