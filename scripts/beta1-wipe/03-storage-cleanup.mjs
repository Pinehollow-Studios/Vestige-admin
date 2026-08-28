// Beta-1 wipe — step 3: delete user-generated storage objects on PROD.
// Run AFTER 02-wipe.sql has committed:
//   node scripts/beta1-wipe/03-storage-cleanup.mjs          (dry run — prints what it would delete)
//   node scripts/beta1-wipe/03-storage-cleanup.mjs --apply  (actually deletes)
//
// Empties: photos-original, photos-rendered, avatars, feedback-screenshots.
// list-covers: deletes everything EXCEPT curated/* and events/* (app content).
// Untouched buckets: course-covers, badge-art, scout-bundles, announcement-media,
// scorecards-original, scorecards-rendered.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const APPLY = process.argv.includes('--apply')

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

const PLAN = [
  { bucket: 'photos-original', keep: () => false },
  { bucket: 'photos-rendered', keep: () => false },
  { bucket: 'avatars', keep: () => false },
  { bucket: 'feedback-screenshots', keep: () => false },
  { bucket: 'list-covers', keep: (name) => name.startsWith('curated/') || name.startsWith('events/') },
]

const listAll = async (bucket, prefix = '') => {
  const names = []
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 100, offset })
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`)
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) names.push(...(await listAll(bucket, full)))
      else names.push(full)
    }
    if (data.length < 100) break
  }
  return names
}

let grandTotal = 0
for (const { bucket, keep } of PLAN) {
  const all = await listAll(bucket)
  const doomed = all.filter((n) => !keep(n))
  const kept = all.length - doomed.length
  console.log(`\n${bucket}: ${all.length} objects — deleting ${doomed.length}, keeping ${kept}`)
  for (const n of doomed) console.log(`  ${APPLY ? 'DELETE' : 'would delete'} ${n}`)
  if (APPLY && doomed.length) {
    for (let i = 0; i < doomed.length; i += 100) {
      const batch = doomed.slice(i, i + 100)
      const { error } = await supabase.storage.from(bucket).remove(batch)
      if (error) throw new Error(`remove ${bucket}: ${error.message}`)
    }
    const after = await listAll(bucket)
    const leftover = after.filter((n) => !keep(n))
    if (leftover.length) throw new Error(`${bucket}: ${leftover.length} doomed objects survived`)
    console.log(`  verified: ${after.length} objects remain, all keepers`)
  }
  grandTotal += doomed.length
}
console.log(`\n${APPLY ? 'Deleted' : 'Would delete'} ${grandTotal} objects total.`)
if (!APPLY) console.log('Dry run only — re-run with --apply to delete.')
