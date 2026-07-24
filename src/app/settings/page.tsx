"use client";

// Settings — functional this pass: default translation (new tiles only, §7),
// streak visuals, daily goal. Everything else renders as visible-but-disabled
// rows so the screen reads complete. Dev reset stays at the bottom.

import { useEffect } from "react";
import { TEXT } from "@/copy/strings";
import { type TranslationCode } from "@/config/game";
import { resetLocalData } from "@/data/localApi";
import { useAvailableTranslations } from "@/lib/bible/available";
import { isCloudMode } from "@/lib/supabase";
import { useApp } from "@/state/store";
import { BottomNav } from "@/components/ui/BottomNav";
import { LockIcon, PixelIcon } from "@/components/ui/icons";
import { AuthScreen } from "@/components/screens/AuthScreen";

export default function SettingsPage() {
  const { ready, authRequired, accountEmail, snapshot, init, saveSettings, signOut } = useApp();
  const available = useAvailableTranslations();
  useEffect(() => {
    void init();
  }, [init]);

  if (ready && authRequired) return <AuthScreen />;
  if (!ready || !snapshot) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-cream">
        <p className="text-sm font-bold text-ink-faint">Loading…</p>
      </main>
    );
  }

  const { user } = snapshot;

  function update(partial: Partial<{ defaultTranslation: TranslationCode; streakVisuals: boolean; dailyGoal: 1 | 2 | 3 }>) {
    void saveSettings({
      defaultTranslation: partial.defaultTranslation ?? user.defaultTranslation,
      streakVisuals: partial.streakVisuals ?? user.streakVisuals,
      dailyGoal: partial.dailyGoal ?? user.dailyGoal,
    });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <main className="w-full flex-1 overflow-y-auto px-4 pb-8 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-4 flex items-center gap-2.5">
            <PixelIcon name="nav-settings" size={26} alt="" />
            <h1 className="text-[20px] font-extrabold text-ink">{TEXT.screens.settings.title}</h1>
          </div>

          <Section title="Verses">
            <Row label="Default translation" hint="Applies to newly added verses only">
              <Segmented
                options={available}
                value={user.defaultTranslation}
                onChange={(v) => update({ defaultTranslation: v })}
              />
            </Row>
            <Row label="WEB translation" hint="Arrives once its verified dataset is harvested" locked />
          </Section>

          <Section title="Experience">
            <Row label="Daily goal" hint="Versuz per day you're aiming for">
              <Segmented
                options={[1, 2, 3] as const}
                value={user.dailyGoal}
                onChange={(v) => update({ dailyGoal: v })}
                render={(v) => `${v}`}
              />
            </Row>
            <Row label="Streak visuals" hint="Hide the flame if streaks stress you out">
              <Toggle checked={user.streakVisuals} onChange={(v) => update({ streakVisuals: v })} />
            </Row>
            <Row label="Sound & haptics" locked />
          </Section>

          <Section title="Accessibility">
            <Row label="Reduce motion" hint="Already follows your device setting" locked />
            <Row label="Text size" locked />
            <Row label="High contrast" locked />
          </Section>

          <Section title="Account">
            {isCloudMode() ? (
              <>
                <Row label="Signed in as" hint={accountEmail ?? undefined}>
                  <button
                    onClick={() => void signOut()}
                    className="rounded-xl border-2 border-bad/40 px-4 py-1.5 text-[12px] font-extrabold text-bad active:bg-bad-wash"
                  >
                    Sign out
                  </button>
                </Row>
                <Row label="Apple · Google sign-in" locked />
                <Row label="Delete account" locked />
              </>
            ) : (
              <>
                <Row label="Sign in" hint="Available on the live site (Supabase cloud mode)" locked />
                <Row label="Delete account" locked />
              </>
            )}
          </Section>

          <Section title="About">
            <Row label="Help & FAQ" locked />
            <Row label="Scripture copyright" hint="Translations used, and their publishers">
              <a href="/copyright" className="text-[12px] font-bold text-gold-deep underline-offset-2 active:underline">
                View
              </a>
            </Row>
            <Row label="Privacy & Terms" locked />
            <Row label="Versuz" hint="Battle the dark with the Word — v0.3 preview">
              <span />
            </Row>
          </Section>

          {!isCloudMode() && (
            <button
              onClick={() => {
                resetLocalData();
                location.href = "/";
              }}
              className="mt-6 w-full rounded-2xl border-2 border-bad/40 bg-white py-3 text-[13px] font-bold text-bad active:bg-bad-wash"
            >
              Reset demo data (dev)
            </button>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint">
        {title}
      </h2>
      <div className="divide-y divide-black/5 rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  hint,
  locked,
  children,
}: {
  label: string;
  hint?: string;
  locked?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3.5 ${locked ? "opacity-55" : ""}`}>
      <div className="min-w-0">
        <p className="text-[14px] font-bold text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-[11px] font-bold text-ink-faint">{hint}</p>}
      </div>
      {locked ? (
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-ink-faint">
          soon <LockIcon size={13} />
        </span>
      ) : (
        children
      )}
    </div>
  );
}

function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  render = (v) => `${v}`,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  render?: (v: T) => string;
}) {
  return (
    <div className="flex shrink-0 gap-1 rounded-xl bg-shell p-1">
      {options.map((opt) => (
        <button
          key={`${opt}`}
          onClick={() => onChange(opt)}
          className={`rounded-lg px-3 py-1.5 text-[12px] font-extrabold transition-colors ${
            opt === value ? "bg-gold text-gold-dark shadow-sm" : "text-ink-soft"
          }`}
        >
          {render(opt)}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border-2 transition-colors ${
        checked ? "border-gold-deep bg-gold" : "border-shell-deep/50 bg-shell"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
