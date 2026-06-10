import Link from "next/link";
import { cn } from "@/lib/utils";
import { ANALYTICS_TABS } from "@/lib/analytics/config";

/** Sub-route tab bar for the analytics surface. Server-rendered; each page
 *  passes its own `active` href (the repo's URL-driven tab idiom). */
export function AnalyticsNav({ active }: { active: string }) {
  return (
    <nav className="inline-flex items-center gap-1 rounded-xl glass-panel p-1 text-xs">
      {ANALYTICS_TABS.map((t) => {
        const isActive = t.href === active;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-lg px-3 py-1.5 font-semibold transition-colors",
              isActive ? "bg-brand/15 text-brand" : "text-ink-3 hover:text-ink-2",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
