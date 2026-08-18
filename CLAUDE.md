
- **2026-08-18** — **Setting drafted from landscape geography** for all 1,794
  courses (`lib/setting-draft/formula.ts`): style baseline + coast distance
  (Natural Earth coastline) + relief (Mapbox Terrain) + National Park/National
  Landscape (Natural England ArcGIS) + road intrusion (Mapbox Streets), clamped
  30-88 so extremes stay human. Course descriptions deliberately **not** mined —
  Tom confirmed they're AI-generated, so scoring them would launder a guess into
  a 40% axis. Gotcha found + fixed: Mapbox's contour layer includes **bathymetry**
  (-500m seabed), which inflated every coastal course's relief until filtered to
  `ele >= 0`. Applied prod + dev; all three axes now populated, Index spans 36-89.
  **Known bias to review**: geography favours the coast, so heathland classics are
  suppressed — Sunningdale (ranked #2 in England) sits at #68. `IndexGuide` tells
  Jack the number is a draft and says which way it errs. Long-form in `CHANGELOG.md`.
