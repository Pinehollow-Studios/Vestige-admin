/**
 * Formatting the app's version + build for admin surfaces.
 *
 * From build 25 (2026-09-05) `CFBundleVersion` is MONOTONIC for the life of
 * the app: it counts every binary ever uploaded to App Store Connect and
 * never resets on a marketing bump (0.4.4 (25) -> 0.4.5 (26) -> ... ->
 * 1.0.0 (31)). Before that every version shipped exactly one build, all of
 * them numbered "1", so `app_version` alone identified a binary.
 *
 * It no longer does. Two builds can share a marketing version - 0.4.4 (1)
 * and 0.4.4 (25) are materially different apps - so every admin surface
 * that reports a version has to show the build beside it, or a bug report
 * cannot be pinned to the code that produced it.
 *
 * The build is deliberately never shown to users: the app's About screen
 * renders the marketing version alone. These helpers are admin-only.
 */

/** `"0.4.4 (25)"`, falling back to the version alone when a row predates
 *  the build column, and to `null` when there is no version either. */
export function formatVersionBuild(
  version: string | null | undefined,
  build: string | null | undefined,
): string | null {
  const v = version?.trim();
  if (!v) return null;
  const b = build?.trim();
  return b ? `${v} (${b})` : v;
}

/** Same, but with an em-dash placeholder for direct rendering in a cell. */
export function formatVersionBuildOrDash(
  version: string | null | undefined,
  build: string | null | undefined,
): string {
  return formatVersionBuild(version, build) ?? "—";
}

/** Sortable build number. Client-supplied text, so anything non-numeric
 *  sorts last rather than poisoning the comparison. */
export function buildSortKey(build: string | null | undefined): number {
  const b = build?.trim();
  if (!b || !/^\d+$/.test(b)) return -1;
  return Number.parseInt(b, 10);
}
