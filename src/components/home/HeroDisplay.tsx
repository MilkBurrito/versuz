"use client";

// §13-B hero display: nameplate + player XP at the top of the environment,
// the chosen character rendered large beneath. Tapping the character opens
// the character screen. (The four equipment slot tiles are hidden for this
// version — the Elemental sprites carry the look; see EquipOverlay for the
// grids when equipment returns.)

import type { UserState } from "@/data/types";
import { playerLevelProgress } from "@/lib/engine/playerLevel";
import { XPBar } from "@/components/ui/Bars";
import { Nameplate } from "@/components/ui/Nameplate";
import { characterById, SpriteAnimator } from "@/components/sprites/SpriteAnimator";
import { Parallax } from "@/components/match/Parallax";
import { envById, HOME_ENVIRONMENT_ID } from "@/config/casting";

export function HeroDisplay({
  user,
  onOpenCharacter,
}: {
  user: UserState;
  onOpenCharacter?: () => void;
}) {
  const { level, intoLevel, levelSpan } = playerLevelProgress(user.playerXp);
  const character = characterById(user.characterSprite);

  return (
    // overflow-x-clip: the 288px-wide hero frames overflow their anchor by
    // design — without the clip they widen the page and mobile pans sideways.
    <section className="relative overflow-x-clip pb-5">
      <Parallax env={envById(HOME_ENVIRONMENT_ID)} />
      <div className="relative mx-auto max-w-md px-6">
        <div className="flex flex-col items-center gap-3 pt-4">
          <Nameplate>
            {user.displayName} · L{level}
          </Nameplate>
          <div className="w-full max-w-xs">
            <XPBar fraction={intoLevel / levelSpan} height={13} />
            <div className="mt-1 flex justify-between text-[10px] font-bold text-white/85">
              <span>{intoLevel} XP</span>
              <span>{levelSpan} XP</span>
            </div>
          </div>
        </div>

        {/* the hero — tap to edit your character */}
        <div className="flex items-center justify-center py-2">
          <button
            aria-label="Edit your character"
            onClick={onOpenCharacter}
            className="flex h-[190px] w-[140px] items-center justify-center overflow-visible transition-transform active:scale-95"
          >
            <SpriteAnimator sprite={character.sprite} anim="idle" size={character.hubSize} />
          </button>
        </div>
      </div>
    </section>
  );
}
