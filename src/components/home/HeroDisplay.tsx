"use client";

// §13-B hero display: the chosen character rendered large and centered with the
// four equipment slots around it (weapon/body/necklace/feet). Slot taps open
// the equip grid; tapping the character opens the character screen.

import { useState } from "react";
import type { EquipSlot, UserState } from "@/data/types";
import { COSMETICS } from "@/data/cosmetics";
import { EquipOverlay } from "@/components/home/EquipOverlay";
import { playerLevelProgress } from "@/lib/engine/playerLevel";
import { XPBar } from "@/components/ui/Bars";
import { Nameplate } from "@/components/ui/Nameplate";
import { PixelIcon } from "@/components/ui/icons";
import { characterById, SpriteAnimator } from "@/components/sprites/SpriteAnimator";
import { Parallax } from "@/components/match/Parallax";
import { envById, HOME_ENVIRONMENT_ID } from "@/config/casting";

/* eslint-disable @next/next/no-img-element */

export function HeroDisplay({
  user,
  onOpenCharacter,
}: {
  user: UserState;
  onOpenCharacter?: () => void;
}) {
  const { level, intoLevel, levelSpan } = playerLevelProgress(user.playerXp);
  const [equipSlot, setEquipSlot] = useState<EquipSlot | null>(null);
  const character = characterById(user.characterSprite);

  return (
    <section className="relative pb-5">
      <Parallax env={envById(HOME_ENVIRONMENT_ID)} />
      <div className="relative mx-auto max-w-md px-6">
        <div className="relative flex items-center justify-center py-4">
          {/* left slots */}
          <div className="absolute left-4 top-4 flex flex-col gap-3">
            <EquipSlotButton slot="body" equippedId={user.equipped.body} onTap={setEquipSlot} />
            <EquipSlotButton slot="weapon" equippedId={user.equipped.weapon} onTap={setEquipSlot} />
          </div>
          {/* right slots */}
          <div className="absolute right-4 top-4 flex flex-col gap-3">
            <EquipSlotButton slot="necklace" equippedId={user.equipped.necklace} onTap={setEquipSlot} />
            <EquipSlotButton slot="feet" equippedId={user.equipped.feet} onTap={setEquipSlot} />
          </div>
          {/* the hero — tap to edit your character */}
          <button
            aria-label="Edit your character"
            onClick={onOpenCharacter}
            className="flex h-[190px] w-[140px] items-center justify-center overflow-visible transition-transform active:scale-95"
          >
            <SpriteAnimator sprite={character.sprite} anim="idle" size={character.hubSize} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
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
      </div>
      {equipSlot && <EquipOverlay slot={equipSlot} onClose={() => setEquipSlot(null)} />}
    </section>
  );
}

function EquipSlotButton({
  slot,
  equippedId,
  onTap,
}: {
  slot: EquipSlot;
  equippedId: string | null;
  onTap: (slot: EquipSlot) => void;
}) {
  // Show the EQUIPPED item's icon when something's in the slot (gold frame);
  // otherwise the slot-type icon, dimmed.
  const equippedItem = equippedId ? COSMETICS.find((c) => c.id === equippedId) : undefined;
  return (
    <button
      aria-label={`Open ${slot} equipment`}
      onClick={() => onTap(slot)}
      className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 shadow-sm transition-transform active:scale-90 ${
        equippedItem ? "border-gold-deep bg-gold-wash" : "border-white/50 bg-white/70"
      }`}
    >
      {equippedItem ? (
        <img
          src={`/icons/items/${equippedItem.icon}.png`}
          width={30}
          height={30}
          alt={equippedItem.name}
          className="pixelated"
          draggable={false}
        />
      ) : (
        <span className="opacity-50 grayscale">
          <PixelIcon name={`slot-${slot}`} size={30} />
        </span>
      )}
    </button>
  );
}
