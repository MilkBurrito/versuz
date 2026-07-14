"use client";

// DOM sprite animator. Two source modes per animation:
//  · strip  — one PNG, frames side by side (enemies)
//  · folder — numbered frame files 1.png..N.png (the Elemental heroes, whose
//    packs ship per-frame PNGs; preloaded on mount so playback never flickers)
// One-shots hold their last frame and fire onEnd — the match flow gates round
// advancement on attack onEnd so attacks always play out in full.
// This stays the clean seam where Phaser/PixiJS drops in later.

import { useEffect, useRef, useState } from "react";

export interface AnimDef {
  /** Strip mode: file name under basePath. */
  file?: string;
  /** Folder mode: directory under basePath containing 1.png..N.png. */
  dir?: string;
  frames: number;
  fps: number;
  loop: boolean;
  /** Row index for grid strips (multi-anim single file); default 0. */
  row?: number;
  /** Per-anim frame size override (packs vary per animation). */
  frameW?: number;
  frameH?: number;
}

export interface SpriteDef {
  basePath: string;
  /** Default frame size (square) — anims may override via frameW/frameH. */
  frameSize: number;
  frameW?: number;
  frameH?: number;
  anims: Record<string, AnimDef>;
}

export function SpriteAnimator({
  sprite,
  anim,
  size = 120,
  flip = false,
  playKey = 0,
  onEnd,
}: {
  sprite: SpriteDef;
  anim: string;
  /** Rendered height in px (width follows the frame's aspect ratio). */
  size?: number;
  flip?: boolean;
  /** Bump to replay a one-shot anim with the same name. */
  playKey?: number;
  onEnd?: () => void;
}) {
  // Remount per (anim, playKey) so each play starts at frame 0.
  return (
    <SpriteStrip
      key={`${anim}:${playKey}`}
      sprite={sprite}
      def={sprite.anims[anim] ?? sprite.anims.idle!}
      size={size}
      flip={flip}
      onEnd={onEnd}
    />
  );
}

function frameSrc(sprite: SpriteDef, def: AnimDef, frame: number): string {
  if (def.dir) return `${sprite.basePath}/${def.dir}/${frame + 1}.png`;
  return `${sprite.basePath}/${def.file}`;
}

function SpriteStrip({
  sprite,
  def,
  size,
  flip,
  onEnd,
}: {
  sprite: SpriteDef;
  def: AnimDef;
  size: number;
  flip: boolean;
  onEnd?: () => void;
}) {
  const [frame, setFrame] = useState(0);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  // Folder mode: warm the frame files so stepping never flashes blank.
  useEffect(() => {
    if (!def.dir) return;
    for (let i = 0; i < def.frames; i++) {
      const img = new Image();
      img.src = frameSrc(sprite, def, i);
    }
  }, [sprite, def]);

  // Frames derive from elapsed TIME, not tick count: background tabs throttle
  // intervals (Chrome: down to one tick/minute), so a per-tick counter could
  // freeze a one-shot mid-attack and never fire onEnd (stuck finishers). With
  // elapsed time, a single late tick jumps straight to the end.
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const f = Math.floor(elapsed * def.fps);
      if (f < def.frames) {
        setFrame(f);
      } else if (def.loop) {
        setFrame(f % def.frames);
      } else {
        clearInterval(interval);
        setFrame(def.frames - 1); // hold last frame
        onEndRef.current?.();
      }
    }, 1000 / def.fps);
    return () => clearInterval(interval);
  }, [def]);

  const frameW = def.frameW ?? sprite.frameW ?? sprite.frameSize;
  const frameH = def.frameH ?? sprite.frameH ?? sprite.frameSize;
  const scale = size / frameH; // size = rendered height; width keeps cell ratio
  const row = def.row ?? 0;
  return (
    <div
      aria-hidden
      style={{
        width: frameW * scale,
        height: size,
        overflow: "hidden",
        flexShrink: 0, // wide frames must overflow flex anchors, not shrink into the clip
        transform: flip ? "scaleX(-1)" : undefined,
      }}
    >
      <div
        className="pixelated"
        style={{
          width: frameW,
          height: frameH,
          backgroundImage: `url(${frameSrc(sprite, def, frame)})`,
          backgroundPosition: def.dir ? "0 0" : `-${frame * frameW}px -${row * frameH}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player characters — the five Elementals. Frames are 288×128 canvases with the
// character bottom-center and effects room; attacks are long and play in full.
// Staged by scripts/stage-art.mjs; frame counts asserted there.
// ---------------------------------------------------------------------------

export interface PlayerCharacter {
  id: string;
  name: string;
  portrait: string; // 64×64 face, /icons/heroes/<id>.png
  sprite: SpriteDef;
  hubSize: number; // rendered height on the hub
  battleSize: number; // rendered height in the match scene
}

type HeroCounts = {
  idle: number; run: number; atk1: number; atk2: number;
  atk3: number; sp_atk: number; hit: number; death: number;
};

function heroSprite(id: string, n: HeroCounts): SpriteDef {
  const anim = (dir: keyof HeroCounts, fps: number, loop: boolean): AnimDef => ({
    dir,
    frames: n[dir],
    fps,
    loop,
    frameW: 288,
    frameH: 128,
  });
  return {
    basePath: `/sprites/heroes/${id}`,
    frameSize: 128,
    frameW: 288,
    frameH: 128,
    anims: {
      idle: anim("idle", 8, true),
      run: anim("run", 10, true),
      atk1: anim("atk1", 14, false),
      atk2: anim("atk2", 14, false),
      atk3: anim("atk3", 14, false),
      sp_atk: anim("sp_atk", 14, false),
      hit: anim("hit", 12, false),
      death: anim("death", 10, false),
    },
  };
}

export const PLAYER_CHARACTERS: PlayerCharacter[] = [
  { id: "fire-knight", name: "Fire Knight", portrait: "/icons/heroes/fire-knight.png", hubSize: 190, battleSize: 165, sprite: heroSprite("fire-knight", { idle: 8, run: 8, atk1: 11, atk2: 19, atk3: 28, sp_atk: 18, hit: 6, death: 13 }) },
  { id: "water-priestess", name: "Water Priestess", portrait: "/icons/heroes/water-priestess.png", hubSize: 190, battleSize: 165, sprite: heroSprite("water-priestess", { idle: 8, run: 10, atk1: 7, atk2: 21, atk3: 27, sp_atk: 32, hit: 7, death: 16 }) },
  { id: "crystal-mauler", name: "Crystal Mauler", portrait: "/icons/heroes/crystal-mauler.png", hubSize: 190, battleSize: 165, sprite: heroSprite("crystal-mauler", { idle: 8, run: 8, atk1: 7, atk2: 7, atk3: 17, sp_atk: 15, hit: 6, death: 15 }) },
  { id: "leaf-ranger", name: "Leaf Ranger", portrait: "/icons/heroes/leaf-ranger.png", hubSize: 190, battleSize: 165, sprite: heroSprite("leaf-ranger", { idle: 12, run: 10, atk1: 10, atk2: 15, atk3: 12, sp_atk: 17, hit: 6, death: 19 }) },
  { id: "metal-bladekeeper", name: "Metal Bladekeeper", portrait: "/icons/heroes/metal-bladekeeper.png", hubSize: 190, battleSize: 165, sprite: heroSprite("metal-bladekeeper", { idle: 8, run: 8, atk1: 6, atk2: 8, atk3: 18, sp_atk: 11, hit: 6, death: 12 }) },
];

/** Unknown/legacy ids (soldier, knight…) migrate to the Fire Knight. */
export function characterById(id: string | null | undefined): PlayerCharacter {
  return PLAYER_CHARACTERS.find((c) => c.id === id) ?? PLAYER_CHARACTERS[0]!;
}
