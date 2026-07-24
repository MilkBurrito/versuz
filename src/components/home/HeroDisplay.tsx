"use client";

// §13-B hero display: nameplate + player XP at the top of the environment,
// then the scene — your character at center, the training dummy standing off
// to the side. Both are tappable: the character opens the character screen,
// the dummy walks into the Training Ground.
//
// (The four equipment slot tiles are hidden for this version — the sprites
// carry the look; see EquipOverlay for the grids when equipment returns.)

import type { UserState } from "@/data/types";
import { playerLevelProgress } from "@/lib/engine/playerLevel";
import { TEXT } from "@/copy/strings";
import { XPBar } from "@/components/ui/Bars";
import { Nameplate } from "@/components/ui/Nameplate";
import { characterById, SpriteAnimator } from "@/components/sprites/SpriteAnimator";
import { Parallax } from "@/components/match/Parallax";
import { envById, HOME_ENVIRONMENT_ID } from "@/config/casting";
import { DUMMY_HOME_H, DUMMY_SPRITE } from "@/config/training";

export function HeroDisplay({
  user,
  onOpenCharacter,
  onOpenTraining,
}: {
  user: UserState;
  onOpenCharacter?: () => void;
  onOpenTraining?: () => void;
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

        {/* the scene: character center-left, training dummy planted to the right */}
        <div className="flex items-end justify-center gap-2 py-2" style={{ minHeight: 190 }}>
          <button
            aria-label={TEXT.home.character}
            onClick={onOpenCharacter}
            className="flex h-[190px] w-[140px] items-end justify-center overflow-visible pb-1 transition-transform active:scale-95"
          >
            <SpriteAnimator sprite={character.sprite} anim="idle" size={character.hubSize} />
          </button>

          {/* The dummy shares the hero's ground line — the caption is absolutely
              positioned so it can't lift the sprite off the floor. */}
          <button
            aria-label={TEXT.home.trainingDummy}
            onClick={onOpenTraining}
            className="relative flex w-[92px] items-end justify-center pb-1 transition-transform active:scale-95"
          >
            <SpriteAnimator sprite={DUMMY_SPRITE} anim="idle" size={DUMMY_HOME_H} />
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white/90">
              {TEXT.home.trainingDummy}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
