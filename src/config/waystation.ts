// The Waystation (Build Brief Phase 3): rest places in the King's territory
// where the Guard keep the Sword sharp. Environments are the Practice
// Environments pack (staged as-is — density normalization waits for final
// art, per the asset guardrail); the opponent is the Pell — inert wood,
// pointedly NOT Darkness (Axiom III), so nothing here carries stakes.

import type { EnvMeta } from "@/config/environments.generated";
import type { SpriteDef } from "@/components/sprites/SpriteAnimator";

function env(n: number): EnvMeta {
  return {
    id: `waystation-${n}`,
    layers: [
      { src: `/environments/waystation-${n}/1-layer.png`, w: 1456, h: 816 },
      { src: `/environments/waystation-${n}/2-layer.png`, w: 1456, h: 816 },
    ],
  };
}

export const WAYSTATION_ENVS: EnvMeta[] = [env(1), env(2), env(3), env(4), env(5)];

/** The Pell — a wooden practice post (48×48 frames, idle + hit). */
export const PELL_SPRITE: SpriteDef = {
  basePath: "/sprites/pell",
  frameSize: 48,
  anims: {
    idle: { dir: "idle", frames: 1, fps: 1, loop: true },
    hit: { dir: "hit", frames: 5, fps: 14, loop: false },
  },
};

export const PELL_DISPLAY_H = 110;
