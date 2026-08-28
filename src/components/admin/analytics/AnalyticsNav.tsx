import { TAB_LIST_CLASS, TabLink } from "@/components/admin/Tabs";
import { ANALYTICS_TABS, DEEP_DIVE_TABS } from "@/lib/analytics/config";

/** Sub-route tab bar for the analytics surface. Server-rendered; each page
 *  passes its own `active` href (the repo's URL-driven tab idiom). Shares the
 *  one canonical tab visual with PageTabs + the feedback queue. Any deep-dive
 *  sub-route lights the "Deep dive" tab. */
export function AnalyticsNav({ active }: { active: string }) {
  const deepHrefs = DEEP_DIVE_TABS.map((t) => t.href as string);
  return (
    <nav className={TAB_LIST_CLASS}>
      {ANALYTICS_TABS.map((t) => {
        const isDeepTab = t.label === "Deep dive";
        const isActive = t.href === active || (isDeepTab && deepHrefs.includes(active));
        return (
          <TabLink key={t.href} href={t.href} active={isActive}>
            {t.label}
          </TabLink>
        );
      })}
    </nav>
  );
}

/** The second row inside Deep dive - Tom's explorer tools. */
export function DeepDiveNav({ active }: { active: string }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5">
      {DEEP_DIVE_TABS.map((t) => (
        <TabLink key={t.href} href={t.href} active={t.href === active}>
          {t.label}
        </TabLink>
      ))}
    </nav>
  );
}
