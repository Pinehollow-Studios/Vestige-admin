-- Beta-1 PROD wipe — one-shot, 2026-08-28. NOT a migration; must never replay.
--
-- IMPORTANT: `supabase db query --linked` in vestige-ios points at DEV
-- (lztggqifpzpnjwqwigks). This script must run against PROD via psql:
--
--   PGPASSWORD="$(tr -d '[:space:]' < ~/Documents/VESTIGE/vestige-prod-db-password.txt)" \
--   /opt/homebrew/opt/libpq/bin/psql \
--     "host=aws-0-eu-west-1.pooler.supabase.com port=5432 dbname=postgres user=postgres.ujbnupjrbroskzwaeulj sslmode=require" \
--     -v ON_ERROR_STOP=1 -f scripts/beta1-wipe/02-wipe.sql
--
-- Removes every app user account (and, via ON DELETE CASCADE, all
-- user-generated data), plus operational/event tables that do not cascade.
-- Keeps app content, admin fabric, and the marketing waitlist. Aborts
-- wholesale if any content table changes or any wiped table is left non-empty.

begin;

-- Guard: refuse to run against a database that doesn't look like Vestige prod
do $$
begin
  if (select count(*) from courses) < 1500 then
    raise exception 'guard: courses count too low — wrong database, aborting';
  end if;
end $$;

-- Pre-counts of content tables that must NOT change
create temp table _guard on commit drop as select
  (select count(*) from courses)                as courses,
  (select count(*) from clubs)                  as clubs,
  (select count(*) from counties)               as counties,
  (select count(*) from badge_definitions)      as badge_definitions,
  (select count(*) from curated_lists)          as curated_lists,
  (select count(*) from curated_list_courses)   as curated_list_courses,
  (select count(*) from clubhouse_events)       as clubhouse_events,
  (select count(*) from society_modes)          as society_modes,
  (select count(*) from feature_flags)          as feature_flags,
  (select count(*) from feature_flag_history)   as feature_flag_history,
  (select count(*) from notification_templates) as notification_templates,
  (select count(*) from email_templates)        as email_templates,
  (select count(*) from app_versions)           as app_versions,
  (select count(*) from app_version_changes)    as app_version_changes,
  (select count(*) from app_version_sections)   as app_version_sections,
  (select count(*) from pro_promo_codes)        as pro_promo_codes,
  (select count(*) from dataset_imports)        as dataset_imports,
  (select count(*) from waitlist_subscribers)   as waitlist_subscribers,
  (select count(*) from waitlist_campaigns)     as waitlist_campaigns,
  (select count(*) from email_campaigns)        as email_campaigns,
  (select count(*) from email_events)           as email_events;

-- 1. Operational/event tables with no cascade from users
delete from app_events;              -- 762 analytics events
delete from push_events;             -- 98
delete from crash_reports;           -- 1
delete from metrickit_payloads;      -- 4
delete from feedback_tag_suggestions;
delete from safeguarding_audit_log;  -- 2
delete from announcements;           -- 5; cascades receipts + targets
delete from admin_broadcasts;        -- 2; cascades broadcast_targets
-- email campaigns, email_events, suppressions and all waitlist tables are
-- KEPT (marketing spine + send history, per Tom 2026-08-28)
delete from feedback_reports;        -- 18; cascades 22 messages, 14 screenshots,
                                     -- and the 14 changelog links (changelog
                                     -- entries themselves survive untouched)
delete from feedback_blocks;
delete from hidden_feed_events;

-- 2. The big one: every auth user except the Bunker/tooling logins.
--    ON DELETE CASCADE clears profiles, rounds, markers, badges, lists,
--    societies, friendships, reactions, comments, photo rows, notifications,
--    device tokens, pro grants/subscriptions, leaderboard snapshots,
--    demographics, saves, and safeguarding flags.
delete from auth.users
where email not in (
  'tom@pinehollow.studio',
  'jack@pinehollow.studio',
  'agent@vestige.golf'
);

-- 3. Fresh founding-member window for beta 1
update founding_member_window
set opened_at = now(), closed_at = null, is_open = true;

-- 4. Assertions — any failure rolls back the entire wipe
do $$
declare
  g record;
  tbl text;
  n bigint;
begin
  select * into g from _guard;
  if (select count(*) from courses)                <> g.courses                or
     (select count(*) from clubs)                  <> g.clubs                  or
     (select count(*) from counties)               <> g.counties               or
     (select count(*) from badge_definitions)      <> g.badge_definitions      or
     (select count(*) from curated_lists)          <> g.curated_lists          or
     (select count(*) from curated_list_courses)   <> g.curated_list_courses   or
     (select count(*) from clubhouse_events)       <> g.clubhouse_events       or
     (select count(*) from society_modes)          <> g.society_modes          or
     (select count(*) from feature_flags)          <> g.feature_flags          or
     (select count(*) from feature_flag_history)   <> g.feature_flag_history   or
     (select count(*) from notification_templates) <> g.notification_templates or
     (select count(*) from email_templates)        <> g.email_templates        or
     (select count(*) from app_versions)           <> g.app_versions           or
     (select count(*) from app_version_changes)    <> g.app_version_changes    or
     (select count(*) from app_version_sections)   <> g.app_version_sections   or
     (select count(*) from pro_promo_codes)        <> g.pro_promo_codes        or
     (select count(*) from dataset_imports)        <> g.dataset_imports        or
     (select count(*) from waitlist_subscribers)   <> g.waitlist_subscribers   or
     (select count(*) from waitlist_campaigns)     <> g.waitlist_campaigns     or
     (select count(*) from email_campaigns)        <> g.email_campaigns        or
     (select count(*) from email_events)           <> g.email_events
  then
    raise exception 'guard: a content table changed — rolling back';
  end if;

  if (select count(*) from auth.users) <> 3 then
    raise exception 'guard: expected exactly 3 auth users, found % — rolling back',
      (select count(*) from auth.users);
  end if;

  foreach tbl in array array[
    'users','user_private','user_demographics','logged_rounds','played_markers',
    'badges','user_lists','user_list_courses','user_list_saves','curated_list_saves',
    'societies','society_members','society_goals','friendships','blocks',
    'feed_reactions','feed_comments','round_comments','round_experiences',
    'round_partners','notifications','notification_preferences','device_tokens',
    'photos','pro_grants','pro_subscriptions','promo_redeem_attempts',
    'leaderboard_metric_snapshots','announcements','announcement_receipts',
    'announcement_targets','admin_broadcasts','broadcast_targets',
    'feedback_reports','feedback_messages','feedback_report_screenshots',
    'app_version_change_reports','app_events','push_events','crash_reports',
    'metrickit_payloads','safeguarding_flags','hidden_feed_events'
  ] loop
    execute format('select count(*) from %I', tbl) into n;
    if n <> 0 then
      raise exception 'guard: % still has % rows — rolling back', tbl, n;
    end if;
  end loop;
end $$;

select
  (select count(*) from auth.users) as auth_users_remaining,
  (select string_agg(email, ', ' order by email) from auth.users) as kept,
  (select count(*) from admins) as admin_rows,
  (select count(*) from courses) as courses_intact,
  (select count(*) from waitlist_subscribers) as waitlist_kept;

commit;
