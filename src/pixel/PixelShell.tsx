"use client";

// The pixel-perfect scaling shell (Build Brief §0.4).
//
// Measures the viewport, computes an INTEGER scale (never fractional), and
// renders its children inside a base-resolution container centered with
// letterbox bars. Children read --u / --s* from tokens.css and must size
// everything in art-pixel multiples.
//
// NEW, ISOLATED scaffolding: nothing in the live app mounts this yet — it
// hosts the style-guide screen (and, later, the migrated app) per the asset
// guardrail.

import { useEffect, useState, type ReactNode } from "react";
import { PIXEL, pixelScale } from "@/pixel/tokens";
import "./tokens.css";

export function PixelShell({
  children,
  /** Override the computed scale (style-guide's 2×/3×/4× buttons). */
  forceScale,
  /** Letterbox bar color — defaults to the Kingdom's darkest night. */
  barColor = "#1d2329",
}: {
  children: ReactNode;
  forceScale?: number;
  barColor?: string;
}) {
  const [autoScale, setAutoScale] = useState(2);

  useEffect(() => {
    const measure = () =>
      setAutoScale(pixelScale(window.innerWidth, window.innerHeight));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const scale = Math.max(1, Math.floor(forceScale ?? autoScale));

  return (
    <div
      className="vz-pixel-shell"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: barColor,
        ["--scale" as string]: scale,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: PIXEL.STAGE_W * scale,
          height: PIXEL.STAGE_H * scale,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
