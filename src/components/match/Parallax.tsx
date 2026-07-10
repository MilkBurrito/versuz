"use client";

// Seamless parallax backdrop. Each layer repeats horizontally at native aspect
// (never stretched) and spans the full container width at any screen size —
// wider screens simply see more repetitions of the loopable art. When
// `scrolling`, layers drift left at depth-scaled speeds (back slow → front
// fast) — used for the match walk-in. One seamless loop = one tile width
// (container height × layer aspect), computed in CSS via container-query
// units (see vz-parallax keyframes in globals.css). Reduced motion disables
// the drift there too.

import type { EnvMeta } from "@/config/environments.generated";

export function Parallax({
  env,
  scrolling = false,
  className = "",
}: {
  env: EnvMeta;
  scrolling?: boolean;
  className?: string;
}) {
  const n = env.layers.length;
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ containerType: "size" }}
    >
      {env.layers.map((layer, i) => {
        const depth = (i + 1) / n; // 0..1, front fastest
        const duration = 26 - depth * 16; // back ~24s … front 10s per loop
        return (
          <div
            key={layer.src}
            className={`pixelated absolute inset-0 ${scrolling ? "vz-parallax-scroll" : ""}`}
            style={{
              backgroundImage: `url(${layer.src})`,
              backgroundRepeat: "repeat-x",
              backgroundSize: "auto 100%",
              backgroundPosition: "0 bottom",
              ["--vz-tile-w" as string]: `${layer.w / layer.h}`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}
