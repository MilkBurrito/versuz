"use client";

// The battle/world stage surface (Build Brief §0.2): a canvas with a FIXED
// internal resolution in source px. Background and sprites are composited in
// the same buffer, so they cannot disagree about pixel density; the element
// is then scaled by the shell's integer --u. Smoothing is off at both layers.
//
// Deliberately renderer-agnostic: `draw` receives a plain 2D context today;
// a PixiJS/Phaser implementation can replace the internals behind the same
// props when the battle stage migrates (SCALE_MODES.NEAREST / pixelArt: true).

import { useEffect, useRef, useState } from "react";
import { PIXEL } from "@/pixel/tokens";

export function PixelStage({
  w = PIXEL.STAGE_W,
  h = PIXEL.STAGE_H,
  draw,
  style,
}: {
  /** Internal resolution in source px (defaults: the canonical stage). */
  w?: number;
  h?: number;
  /** Composite the scene into the fixed-resolution buffer. */
  draw: (ctx: CanvasRenderingContext2D) => void;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    draw(ctx);
  }, [w, h, draw]);

  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      style={{
        width: `calc(var(--u) * ${w})`,
        height: `calc(var(--u) * ${h})`,
        imageRendering: "pixelated",
        display: "block",
        ...style,
      }}
    />
  );
}

/** Load images for stage drawing; returns them once every file has decoded. */
export function usePixelImages(srcs: string[]): HTMLImageElement[] | null {
  const [images, setImages] = useState<HTMLImageElement[] | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all(
      srcs.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          }),
      ),
    )
      .then((loaded) => alive && setImages(loaded))
      .catch(() => alive && setImages(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [srcs.join("|")]);
  return images;
}
