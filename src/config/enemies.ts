// Enemy registry — SpriteDefs built from the staged strip metadata
// (enemies.generated.ts, measured from PNG headers). Idle-only enemies are
// fine: the animator falls back to idle for any missing animation.

import type { SpriteDef } from "@/components/sprites/SpriteAnimator";
import { ENEMY_META, type EnemyMeta } from "@/config/enemies.generated";

export interface Enemy {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  displayH: number;
  sprite: SpriteDef;
  /** Mirror at render time so the enemy looks LEFT at the hero. */
  flip: boolean;
}

// Native art facing, audited sprite by sprite: enemies stand on the right of
// the scene and must face the hero, so RIGHT-facing art gets mirrored and
// left-facing art renders as drawn. (Frontal/symmetric sprites count as left.)
const FACES_RIGHT = new Set([
  "orc",
  "blood-monster",
  "demon-imp",
  "lizzard",
  "mutant-toad",
  "wizard",
]);

const FPS: Record<string, { fps: number; loop: boolean }> = {
  idle: { fps: 8, loop: true },
  attack: { fps: 12, loop: false },
  hurt: { fps: 12, loop: false },
  death: { fps: 8, loop: false },
};

function toEnemy(meta: EnemyMeta): Enemy {
  const anims: SpriteDef["anims"] = {};
  for (const [role, m] of Object.entries(meta.anims)) {
    if (!m) continue;
    anims[role] = {
      file: m.file,
      frames: m.frames,
      frameW: m.frameW,
      frameH: m.frameH,
      ...FPS[role]!,
    };
  }
  return {
    id: meta.id,
    name: meta.name,
    tier: meta.tier,
    displayH: meta.displayH,
    sprite: { basePath: `/sprites/enemies/${meta.id}`, frameSize: 100, anims },
    flip: FACES_RIGHT.has(meta.id),
  };
}

export const ENEMIES: Enemy[] = ENEMY_META.map(toEnemy);

const BY_ID = new Map(ENEMIES.map((e) => [e.id, e]));

export function enemyById(id: string): Enemy {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`Unknown enemy: ${id}`);
  return e;
}

export function enemiesOfTier(tier: 1 | 2 | 3): Enemy[] {
  return ENEMIES.filter((e) => e.tier === tier);
}
