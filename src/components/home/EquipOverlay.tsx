"use client";

// Equip grid overlay (v1.2 §10-B, Armor Screen mockup): full-screen, one slot's
// items in a grid — equipped gets the gold ring, owned are selectable, locked
// show their unlock condition. Select an owned item → Equip.

import { useState } from "react";
import { cosmeticsForSlot, isOwned, unlockLabel, type CosmeticItem } from "@/data/cosmetics";
import type { EquipSlot } from "@/data/types";
import { playerLevelFromXp } from "@/lib/engine/playerLevel";
import { useApp } from "@/state/store";
import { Button } from "@/components/ui/Button";
import { CloseIcon, LockIcon } from "@/components/ui/icons";

/* eslint-disable @next/next/no-img-element */

const SLOT_TITLES: Record<EquipSlot, string> = {
  weapon: "Your Weapons",
  body: "Your Armor",
  necklace: "Your Necklaces",
  feet: "Your Boots",
};

export function EquipOverlay({ slot, onClose }: { slot: EquipSlot; onClose: () => void }) {
  const { snapshot, equip } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!snapshot) return null;

  const playerLevel = playerLevelFromXp(snapshot.user.playerXp);
  const cleared = new Set(
    snapshot.userCampaigns
      .filter((c) => c.status === "cleared" || c.status === "mastered")
      .map((c) => c.campaignId),
  );
  const equippedId = snapshot.user.equipped[slot];
  const items = cosmeticsForSlot(slot);
  const selectedItem = items.find((i) => i.id === selected);
  const canEquip = selectedItem !== undefined && selected !== equippedId;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="w-full bg-[#5b5f68] pb-4 pt-[calc(env(safe-area-inset-top)+10px)]">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4">
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-white/85 active:bg-white/10">
            <CloseIcon size={20} />
          </button>
          <h2 className="text-[15px] font-extrabold uppercase tracking-[0.15em] text-white">
            {SLOT_TITLES[slot]}
          </h2>
        </div>
      </div>

      <div className="w-full flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full max-w-xl">
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
            {items.map((item) => (
              <EquipCell
                key={item.id}
                item={item}
                owned={isOwned(item, playerLevel, cleared)}
                equipped={item.id === equippedId}
                selected={item.id === selected}
                onTap={() => setSelected(item.id === selected ? null : item.id)}
              />
            ))}
            {/* empty placeholder cells, per the mockup's fading grid */}
            {Array.from({ length: Math.max(0, 12 - items.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="aspect-square rounded-2xl bg-shell"
                style={{ opacity: Math.max(0.15, 0.6 - i * 0.07) }}
              />
            ))}
          </div>
          {selectedItem && (
            <p className="mt-4 text-center text-[13px] font-bold text-ink">
              {selectedItem.name}
              {!isOwned(selectedItem, playerLevel, cleared) && (
                <span className="ml-2 text-[11px] text-ink-faint">
                  🔒 {unlockLabel(selectedItem)}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="w-full border-t border-black/5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
        <div className="mx-auto w-full max-w-md px-5">
          <Button
            className="w-full"
            disabled={
              !canEquip ||
              busy ||
              (selectedItem !== undefined && !isOwned(selectedItem, playerLevel, cleared))
            }
            onClick={async () => {
              if (!selected) return;
              setBusy(true);
              try {
                await equip(slot, selected);
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {selected === equippedId ? "Equipped" : "Equip"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EquipCell({
  item,
  owned,
  equipped,
  selected,
  onTap,
}: {
  item: CosmeticItem;
  owned: boolean;
  equipped: boolean;
  selected: boolean;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      aria-label={item.name}
      className={`relative flex aspect-square items-center justify-center rounded-2xl border-2 transition-all active:scale-95 ${
        equipped
          ? "border-gold-deep bg-gold-wash"
          : selected
            ? "border-ink bg-white"
            : owned
              ? "border-shell-deep/40 bg-white"
              : "border-shell bg-shell"
      }`}
    >
      <img
        src={`/icons/items/${item.icon}.png`}
        width={38}
        height={38}
        alt=""
        className={`pixelated ${owned ? "" : "opacity-40 grayscale"}`}
        draggable={false}
      />
      {!owned && (
        <span className="absolute bottom-1 right-1 text-ink-faint">
          <LockIcon size={12} />
        </span>
      )}
      {equipped && (
        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-gold px-1.5 text-[9px] font-extrabold text-gold-dark">
          ✓
        </span>
      )}
    </button>
  );
}
