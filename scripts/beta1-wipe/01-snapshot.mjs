// Beta-1 wipe — step 1: JSON snapshot of every public table on PROD.
// Read-only. Run from the bunker repo root:
//   node scripts/beta1-wipe/01-snapshot.mjs
// Writes one JSON file per table to ~/Documents/VESTIGE/backups/beta1-wipe-2026-08-28/
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'

const env = Object.fromEntries(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const url = env.NEXT_PUBLIC_SUPABASE_URL_PROD
const key = env.SUPABASE_SERVICE_ROLE_KEY_PROD
if (!url || !key) throw new Error('missing PROD url/service key in .env.local')
if (!url.includes('ujbnupjrbroskzwaeulj')) throw new Error(`guard: url is not prod (${url})`)

const supabase = createClient(url, key, { auth: { persistSession: false } })
const outDir = path.join(homedir(), 'Documents/VESTIGE/backups/beta1-wipe-2026-08-28')
mkdirSync(outDir, { recursive: true })

const TABLES = [
  '_archive_verification', 'admin_broadcasts', 'admins', 'analytics_config',
  'announcement_receipts', 'announcement_targets', 'announcements', 'app_events',
  'app_version_change_reports', 'app_version_changes', 'app_version_config',
  'app_version_sections', 'app_versions', 'areas', 'badge_definitions', 'badges',
  'blocks', 'broadcast_targets', 'clubhouse_event_courses', 'clubhouse_events',
  'clubs', 'counties', 'course_pair_affinity', 'courses', 'crash_reports',
  'curated_list_courses', 'curated_list_saves', 'curated_lists', 'dataset_imports',
  'device_tokens', 'email_campaign_recipients', 'email_campaign_targets',
  'email_campaigns', 'email_events', 'email_suppressions', 'email_templates',
  'feature_flag_history', 'feature_flag_targets', 'feature_flags', 'feed_comments',
  'feed_reactions', 'feedback_blocks', 'feedback_messages',
  'feedback_report_screenshots', 'feedback_reports', 'feedback_tag_suggestions',
  'founding_member_window', 'friendships', 'hidden_feed_events',
  'leaderboard_metric_snapshots', 'logged_rounds', 'metrickit_payloads',
  'new_course_notification_state', 'notification_preferences',
  'notification_templates', 'notifications', 'ops_heartbeat', 'photos',
  'played_markers', 'pro_config', 'pro_grants', 'pro_promo_codes',
  'pro_subscriptions', 'promo_redeem_attempts', 'push_events', 'round_comments',
  'round_experiences', 'round_partners', 'safeguard_config',
  'safeguarding_audit_log', 'safeguarding_flags', 'scout_bundle_manifest',
  'scout_config', 'segments', 'societies', 'society_badges', 'society_challenges',
  'society_goals', 'society_invites', 'society_match_members', 'society_matches',
  'society_members', 'society_milestones', 'society_modes', 'user_demographics',
  'user_list_courses', 'user_list_saves', 'user_lists', 'user_private', 'users',
  'vestige_index_config', 'waitlist_campaign_recipients',
  'waitlist_campaign_targets', 'waitlist_campaigns', 'waitlist_subscribers',
]

const PAGE = 1000
let totalRows = 0
for (const table of TABLES) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...data)
    if (data.length < PAGE) break
  }
  writeFileSync(path.join(outDir, `${table}.json`), JSON.stringify(rows))
  totalRows += rows.length
  if (rows.length) console.log(`${table.padEnd(36)} ${rows.length}`)
}

// Storage object listing (names only — files themselves are not downloaded)
const { data: buckets, error: bErr } = await supabase.storage.listBuckets()
if (bErr) throw bErr
const storageIndex = {}
for (const b of buckets) {
  const names = []
  const walk = async (prefix) => {
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await supabase.storage.from(b.name).list(prefix, { limit: 100, offset })
      if (error) throw new Error(`${b.name}/${prefix}: ${error.message}`)
      for (const item of data) {
        const full = prefix ? `${prefix}/${item.name}` : item.name
        if (item.id === null) await walk(full)
        else names.push(full)
      }
      if (data.length < 100) break
    }
  }
  await walk('')
  storageIndex[b.name] = names
}
writeFileSync(path.join(outDir, '_storage-index.json'), JSON.stringify(storageIndex, null, 1))

console.log(`\nSnapshot complete: ${totalRows} rows across ${TABLES.length} tables → ${outDir}`)
