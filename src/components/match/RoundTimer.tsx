"use client";

// A round's clock. Draining it is a BONUS opportunity, not a threat: when it
// lapses the round carries on exactly as before — you just don't collect the
// bonus. Nothing here can cost HP or fail a round.
//
// Remaining time comes from WALL-CLOCK deltas, not tick counts, because
// browsers throttle intervals in background tabs (the same trap that once
// froze the sprite animator). While `paused`, the elapsed segment is banked
// and the clock genuinely stops — an attack animation must not eat your time.
//
// Mount this with a `key` per round; fresh state per clock, no reset effect.

import { useEffect, useRef, useState } from "react";
import { TEXT } from "@/copy/strings";

export function RoundTimer({
  seconds,
  /** Fired once when the clock lapses. */
  onExpire,
  /** Frozen while an attack animation plays out. */
  paused = false,
}: {
  seconds: number;
  onExpire: () => void;
  paused?: boolean;
}) {
  const [remaining, setRemaining] = useState(seconds);
  /** Seconds already consumed while running. */
  const consumedRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (paused) return;
    segmentStartRef.current = Date.now();
    const id = setInterval(() => {
      const running = (Date.now() - (segmentStartRef.current ?? Date.now())) / 1000;
      const left = seconds - (consumedRef.current + running);
      setRemaining(Math.max(0, left));
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(id);
        onExpireRef.current();
      }
    }, 200);
    return () => {
      // Bank this running segment so a pause doesn't cost the player time.
      if (segmentStartRef.current !== null) {
        consumedRef.current += (Date.now() - segmentStartRef.current) / 1000;
        segmentStartRef.current = null;
      }
      clearInterval(id);
    };
  }, [paused, seconds]);

  const fraction = Math.max(0, Math.min(1, remaining / seconds));
  const lapsed = remaining <= 0;
  const urgent = !lapsed && fraction < 0.25;

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-shell"
        role="progressbar"
        aria-label="Bonus timer"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-linear ${
            lapsed ? "bg-ink-faint" : urgent ? "bg-bad" : "bg-gold"
          }`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span
        className={`w-16 shrink-0 text-right text-[10px] font-extrabold uppercase tracking-wide ${
          lapsed ? "text-ink-faint" : urgent ? "text-bad" : "text-gold-deep"
        }`}
      >
        {lapsed ? TEXT.match.timerLapsed : TEXT.match.timerRemaining(Math.ceil(remaining))}
      </span>
    </div>
  );
}
