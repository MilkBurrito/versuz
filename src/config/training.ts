// Training Ground (free practice) config. The dummy and the practice
// backdrops are the supplied packs, staged as-is — density normalization
// waits for final art (see docs/pixel-foundation.md).

import type { EnvMeta } from "@/config/environments.generated";
import type { SpriteDef } from "@/components/sprites/SpriteAnimator";
import type { MinigameType } from "@/lib/engine/match";

function env(n: number): EnvMeta {
  return {
    id: `training-${n}`,
    layers: [
      { src: `/environments/waystation-${n}/1-layer.png`, w: 1456, h: 816 },
      { src: `/environments/waystation-${n}/2-layer.png`, w: 1456, h: 816 },
    ],
  };
}

export const TRAINING_ENVS: EnvMeta[] = [env(1), env(2), env(3), env(4), env(5)];

/** The training dummy — 48×48 frames, idle + hit. */
export const DUMMY_SPRITE: SpriteDef = {
  basePath: "/sprites/pell",
  frameSize: 48,
  anims: {
    idle: { dir: "idle", frames: 1, fps: 1, loop: true },
    hit: { dir: "hit", frames: 5, fps: 14, loop: false },
  },
};

/** Rendered height in the training scene, and smaller again on the home hub. */
export const DUMMY_DISPLAY_H = 84;
export const DUMMY_HOME_H = 78;

/** The pickable games, in the order they appear in the setup screen. */
/** Listed easiest → hardest, matching the difficulty ladder in game.ts. */
export const TRAINABLE_GAMES: readonly MinigameType[] = [
  "spot_the_lie",
  "mystery_word",
  "letter_reveal",
  "phrase_bank",
  "word_bank",
  "word_order",
  "fading_words",
  "first_letter",
  "snowball",
  "rapid_recall",
];
