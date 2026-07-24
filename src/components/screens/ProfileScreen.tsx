"use client";

// Profile (v1.2 §13-D): character preview + Change Character, derived badges,
// mastered verses (with the §9.7 Needs-Refresh state), lifetime stats.
// Badges derive from existing state — persistence arrives with Supabase wiring.

import { GAME } from "@/config/game";
import { TEXT } from "@/copy/strings";
import type { GameSnapshot } from "@/data/api";
import { needsRefresh } from "@/lib/engine/mastery";
import { playerLevelFromXp } from "@/lib/engine/playerLevel";
import { displayRef } from "@/lib/refs";
import { useApp } from "@/state/store";
import { PixelIcon } from "@/components/ui/icons";
import { characterById, SpriteAnimator } from "@/components/sprites/SpriteAnimator";
import { Card, InfoRow, OverlayShell, SectionLabel } from "@/components/screens/OverlayShell";

interface Badge {
  key: string;
  icon: string; // PixelIcon name
  label: string;
  earned: boolean;
}

function deriveBadges(snapshot: GameSnapshot): Badge[] {
  const mastered = snapshot.tiles.filter((t) => t.status === "mastered");
  const clearedCampaigns = snapshot.userCampaigns
    .filter((c) => c.status === "cleared" || c.status === "mastered")
    .map((c) => snapshot.campaigns.find((x) => x.id === c.campaignId))
    .filter((c) => c !== undefined);
  const playerLevel = playerLevelFromXp(snapshot.user.playerXp);

  // Icons are the Raven badge picks (public/icons/ui/badge-*.png); campaign
  // badges carry their theme's emblem — the same one shown on Explore tiles.
  const badges: Badge[] = [
    ...mastered.map((t) => ({
      key: `mastered-${t.id}`,
      icon: "badge-mastered",
      label: displayRef(t.verseId),
      earned: true,
    })),
    ...clearedCampaigns.map((c) => ({
      key: `campaign-${c.id}`,
      icon: `badge-${c.theme}`,
      label: c.name,
      earned: true,
    })),
  ];
  // Streak milestones: earned + the next one to chase.
  for (const m of [7, 30, 100, 365]) {
    const earned = snapshot.user.longestStreak >= m;
    badges.push({ key: `streak-${m}`, icon: "badge-streak", label: `${m}-day streak`, earned });
    if (!earned) break;
  }
  // Player level milestones, same pattern.
  for (const m of [3, 5, 10, 15, 20]) {
    const earned = playerLevel >= m;
    badges.push({ key: `level-${m}`, icon: "badge-level", label: `Level ${m}`, earned });
    if (!earned) break;
  }
  return badges;
}

export function ProfileScreen({
  onClose,
  onChangeCharacter,
}: {
  onClose: () => void;
  onChangeCharacter: () => void;
}) {
  const { snapshot, openOverlay } = useApp();
  if (!snapshot) return null;
  const { user, tiles } = snapshot;
  const character = characterById(user.characterSprite);
  const playerLevel = playerLevelFromXp(user.playerXp);
  const badges = deriveBadges(snapshot);
  const today = todayStr();
  const mastered = tiles.filter((t) => t.status === "mastered");
  const totalPractices = tiles.reduce((n, t) => n + t.practiceCount, 0);

  return (
    <OverlayShell title={TEXT.screens.profile.title} onClose={onClose}>
      {/* character */}
      <div className="flex flex-col items-center pb-2 pt-3">
        <SpriteAnimator sprite={character.sprite} anim="idle" size={Math.round(character.hubSize * 0.8)} />
        <div className="mt-2 text-[20px] font-extrabold text-ink">{user.displayName}</div>
        <div className="text-[12px] font-bold text-ink-faint">
          Player Level {playerLevel} · {character.name}
        </div>
        <button
          onClick={onChangeCharacter}
          className="mt-3 rounded-2xl border-2 border-shell-deep/50 bg-white px-5 py-2 text-[13px] font-bold text-ink-soft active:bg-shell"
        >
          Change Character
        </button>
      </div>

      <SectionLabel>{TEXT.screens.profile.badges}</SectionLabel>
      {badges.length === 0 ? (
        <Card>
          <p className="text-[13px] text-ink-soft">Master a verse to earn your first badge.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {badges.map((b) => (
            <div
              key={b.key}
              className={`flex flex-col items-center gap-1 rounded-2xl bg-white px-1 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${
                b.earned ? "" : "opacity-45"
              }`}
              title={b.label}
            >
              <PixelIcon name={b.icon} size={30} className={b.earned ? "" : "grayscale"} alt="" />
              <span className="max-w-full truncate px-1 text-center text-[9px] font-extrabold text-ink-soft">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      )}

      <SectionLabel>{TEXT.screens.profile.mastered}</SectionLabel>
      {mastered.length === 0 ? (
        <Card>
          <p className="text-[13px] text-ink-soft">
            None yet — reach Level 7 on a verse and it moves in here.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {mastered.map((t) => {
            const stale = needsRefresh(t.status, t.lastPracticedDate, today);
            return (
              <button
                key={t.id}
                onClick={() => {
                  onClose();
                  openOverlay(t.id);
                }}
                className={`flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-[0_1px_3px_rgba(0,0,0,0.06)] active:scale-[0.985] ${
                  stale ? "border-2 border-dashed border-gold/60" : ""
                }`}
              >
                <span className="font-serif text-[15px] text-ink">
                  {displayRef(t.verseId)}
                  <span className="ml-2 font-sans text-[10px] font-bold text-ink-faint">
                    {t.translation}
                  </span>
                </span>
                {stale ? (
                  <span className="vz-glow flex items-center gap-1.5 text-[11px] font-extrabold text-gold-deep">
                    <PixelIcon name="mastered" size={18} className="opacity-60 saturate-50" alt="" />
                    needs refresh
                  </span>
                ) : (
                  <PixelIcon name="mastered" size={20} alt="Mastered" />
                )}
              </button>
            );
          })}
          {mastered.some((t) => needsRefresh(t.status, t.lastPracticedDate, today)) && (
            <p className="px-1 text-[11px] font-bold text-ink-faint">
              A dimmed badge means {GAME.decay.NEEDS_REFRESH_DAYS}+ days without practice — no
              progress lost, one refresh versuz restores the shine.
            </p>
          )}
        </div>
      )}

      <SectionLabel>Lifetime</SectionLabel>
      <Card className="divide-y divide-black/5">
        <InfoRow label="Verses in your library" value={tiles.length} />
        <InfoRow label="Verses mastered" value={mastered.length} />
        <InfoRow label="Practices completed" value={totalPractices} />
        <InfoRow label="Longest streak" value={`${user.longestStreak} days`} />
        <InfoRow label="Total XP" value={user.playerXp.toLocaleString()} />
        <InfoRow label="Gems banked" value={user.coins} />
      </Card>
    </OverlayShell>
  );
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
