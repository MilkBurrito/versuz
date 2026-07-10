// v1 cosmetic inventory (Appendix C shape, placeholder items). Visual-only.
// Ownership is derived (no spend): defaults are owned; the rest unlock by
// player level or campaign clears. Icons are 64×64 Raven Fantasy picks under
// public/icons/items/; character sprites stay the placeholder Soldier for now.

import type { EquipSlot } from "@/data/types";

export interface CosmeticItem {
  id: string;
  name: string;
  slot: EquipSlot;
  /** File under public/icons/items (without extension). */
  icon: string;
  unlock:
    | { kind: "default" }
    | { kind: "player_level"; level: number }
    | { kind: "campaign_cleared"; campaignId: string; campaignName: string };
}

export const COSMETICS: CosmeticItem[] = [
  // weapons — the marquee slot (they carry the golden aura)
  { id: "starter-sword", name: "Starter Sword", slot: "weapon", icon: "starter-sword", unlock: { kind: "default" } },
  { id: "bronze-blade", name: "Bronze Blade", slot: "weapon", icon: "bronze-blade", unlock: { kind: "player_level", level: 5 } },
  { id: "oak-bow", name: "Oak Bow", slot: "weapon", icon: "oak-bow", unlock: { kind: "campaign_cleared", campaignId: "campaign-anxiety", campaignName: "Anxiety" } },
  { id: "gilded-sword", name: "Gilded Sword", slot: "weapon", icon: "gilded-sword", unlock: { kind: "player_level", level: 10 } },
  // body
  { id: "traveler-tunic", name: "Traveler Tunic", slot: "body", icon: "traveler-tunic", unlock: { kind: "default" } },
  { id: "pilgrim-cloak", name: "Pilgrim Cloak", slot: "body", icon: "pilgrim-cloak", unlock: { kind: "player_level", level: 3 } },
  { id: "warrior-plate", name: "Warrior Plate", slot: "body", icon: "warrior-plate", unlock: { kind: "campaign_cleared", campaignId: "campaign-foundation", campaignName: "Foundation Track" } },
  // necklace (replaces the legs slot)
  { id: "simple-cord", name: "Simple Cord", slot: "necklace", icon: "simple-cord", unlock: { kind: "default" } },
  { id: "emerald-pendant", name: "Emerald Pendant", slot: "necklace", icon: "emerald-pendant", unlock: { kind: "player_level", level: 4 } },
  { id: "scarlet-pendant", name: "Scarlet Pendant", slot: "necklace", icon: "scarlet-pendant", unlock: { kind: "campaign_cleared", campaignId: "campaign-identity", campaignName: "Identity" } },
  // feet
  { id: "worn-boots", name: "Worn Boots", slot: "feet", icon: "worn-boots", unlock: { kind: "default" } },
  { id: "swift-sandals", name: "Swift Sandals", slot: "feet", icon: "swift-sandals", unlock: { kind: "player_level", level: 7 } },
];

export function cosmeticsForSlot(slot: EquipSlot): CosmeticItem[] {
  return COSMETICS.filter((c) => c.slot === slot);
}

export function isOwned(
  item: CosmeticItem,
  playerLevel: number,
  clearedCampaignIds: Set<string>,
): boolean {
  switch (item.unlock.kind) {
    case "default":
      return true;
    case "player_level":
      return playerLevel >= item.unlock.level;
    case "campaign_cleared":
      return clearedCampaignIds.has(item.unlock.campaignId);
  }
}

export function unlockLabel(item: CosmeticItem): string {
  switch (item.unlock.kind) {
    case "default":
      return "Starter";
    case "player_level":
      return `Level ${item.unlock.level}`;
    case "campaign_cleared":
      return `Clear ${item.unlock.campaignName}`;
  }
}
