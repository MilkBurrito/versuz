// §9.8 Player level — derived from lifetime XP against the (tunable) curve.

import { GAME } from "@/config/game";

export function playerLevelFromXp(playerXp: number): number {
  let level = 1;
  for (let l = GAME.player.LEVEL_CAP; l >= 1; l--) {
    if (playerXp >= GAME.player.xpForLevel(l)) {
      level = l;
      break;
    }
  }
  return level;
}

export function playerLevelProgress(playerXp: number): {
  level: number;
  intoLevel: number;
  levelSpan: number;
} {
  const level = playerLevelFromXp(playerXp);
  const cur = GAME.player.xpForLevel(level);
  const next =
    level >= GAME.player.LEVEL_CAP ? cur : GAME.player.xpForLevel(level + 1);
  return { level, intoLevel: playerXp - cur, levelSpan: Math.max(1, next - cur) };
}
