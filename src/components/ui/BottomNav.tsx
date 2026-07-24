"use client";

// Four-tab bottom nav (v1.2 §13-B), spoken in the Kingdom's voice:
// Kingdom · Settlements · Forge · Provisions. The Forge ships as a
// coming-soon stub; the gold dot marks it not-yet-lit.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LORE } from "@/lore/strings";
import { PixelIcon } from "@/components/ui/icons";

const TABS = [
  { href: "/", label: LORE.nav.home, icon: "nav-home" },
  { href: "/explore", label: LORE.nav.explore, icon: "nav-explore" },
  { href: "/shop", label: LORE.nav.shop, icon: "nav-shop", soon: true },
  { href: "/settings", label: LORE.nav.settings, icon: "nav-settings" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-1 flex-col items-center gap-1 py-2.5"
            >
              <span className={active ? "" : "opacity-45 grayscale"}>
                <PixelIcon name={tab.icon} size={24} />
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  active ? "text-gold-deep" : "text-ink-faint"
                }`}
              >
                {tab.label}
              </span>
              {"soon" in tab && tab.soon && (
                <span className="absolute right-1/2 top-1.5 mr-[-18px] h-1.5 w-1.5 rounded-full bg-gold" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
