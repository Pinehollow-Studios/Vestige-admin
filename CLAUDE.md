
- **2026-08-18** — **Index page simplified.** Three stacked collapsibles
  (mechanics/guide/ranking import) replaced by one `IndexControls` strip —
  three toggles opening a single panel at a time, Recompute lifted out as its
  own action; the panels became plain content components. Table drops the
  duplicate "Projected" column (a pending edit now recolours the Index cell
  amber in place; min-width 760→680px). County cards drop the stale "N to rank"
  chip, which had become a permanent "all ranked" once every course was scored —
  landing query narrows to `county_id, vestige_index`. Presentation only.
  Verified `tsc`/`eslint`/`build` + clean dev boot. Long-form in `CHANGELOG.md`.
