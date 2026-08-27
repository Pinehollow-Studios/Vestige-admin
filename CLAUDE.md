
- **2026-08-27** — **Changelog visual rework.** Timeline rail + banners out;
  each version is a feed card — oversized hero version number (current wears
  the mint gradient), native `<details>` collapse (latest + drafts open,
  history collapsed, zero JS), chip-led items in a fixed 64px column on a
  hairline-ruled section heading, tinted chips shared editor↔read via
  `CHANGE_LABEL_CHIP`. Phone-first: 56px tap rows, counts/labels hide below
  `sm:`. `tsc`/`eslint`/`build` green. Long-form in `CHANGELOG.md` 2026-08-27
  (visual rework).

- **2026-08-27** — **Changelog rebuilt area-first.** A version is now ordered
  free-text sections ("Map", "Pro", "Fixes") of items, each with an optional
  New/Improved/Fixed/Removed chip, detail line, and ANY number of linked
  feedback reports (junction `app_version_change_reports`). Editor: Enter-to-add,
  paste-a-list, drag reorder across sections, heading autocomplete. iOS-repo
  migration `20260827150000` applied dev + prod same day (0.4.x content
  converted; verified on prod). `tsc`/`eslint`/`build` green.
  Long-form in `CHANGELOG.md` 2026-08-27.

- **2026-08-18** — **Index panels stripped to the numbers.** The guide is now
  tables only (axes ordered by weight, Setting rubric, Age bands, rank→score,
  one line for the scale) — no intro prose, no high/low cards, no calibration
  write-up; 240→132 lines and back to a server component. Weights loses the
  written formula + worked-example box, keeping sliders + Apply. Ranking import
  loses the source chips and the "Top of the list" table, keeping four
  single-word counters (To set · Unchanged · Hand-set · To check) + the
  exceptions list. Verified `tsc`/`eslint`/`build`. Long-form in `CHANGELOG.md`.
