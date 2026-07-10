"use client";

// Shop stub (§10-A): coins are visible but not spendable in v1 — this screen's
// one job is explaining that, and how cosmetics are actually earned meanwhile.

import { useEffect } from "react";
import { useApp } from "@/state/store";
import { BottomNav } from "@/components/ui/BottomNav";
import { PixelIcon } from "@/components/ui/icons";
import { AuthScreen } from "@/components/screens/AuthScreen";

export default function ShopPage() {
  const { ready, authRequired, init } = useApp();
  useEffect(() => {
    void init();
  }, [init]);

  if (ready && authRequired) return <AuthScreen />;

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <main className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <PixelIcon name="nav-shop" size={64} alt="Shop" />
        <h1 className="mt-3 text-lg font-extrabold text-ink">Shop</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
          Your gems are banking up — spending them arrives in a later update.
        </p>
        <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-ink-faint">
          Until then, weapons, outfits, and gear unlock by clearing campaigns, leveling up,
          and finishing weekly quests.
        </p>
        <span className="mt-5 rounded-full border-2 border-gold bg-gold-wash px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-gold-deep">
          Coming soon
        </span>
      </main>
      <BottomNav />
    </div>
  );
}
