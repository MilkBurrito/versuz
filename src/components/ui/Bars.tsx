// Progress + HP bars. One gold bar shape for XP/mastery (mockups), a segmented
// red bar for player HP (mistakes budget), and the wide enemy HP bar with the
// diamond cap from the Play Screen mockup.

export function XPBar({
  fraction,
  height = 12,
  className = "",
}: {
  fraction: number; // 0..1
  height?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${className}`}
      style={{
        height,
        background: "#dcd7cc",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.18)",
      }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${pct}%`,
          background:
            "linear-gradient(180deg, var(--color-gold-soft) 0%, var(--color-gold) 60%, var(--color-gold-deep) 100%)",
        }}
      />
    </div>
  );
}

/** Player HP: one segment per remaining mistake allowed. */
export function PlayerHpBar({ total, filled }: { total: number; filled: number }) {
  return (
    <div className="flex gap-1" aria-label={`${filled} of ${total} HP`}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-3 w-5 rounded-[3px] border transition-colors"
          style={
            i < filled
              ? { background: "var(--color-hp)", borderColor: "var(--color-hp-deep)" }
              : { background: "rgba(255,255,255,0.25)", borderColor: "rgba(255,255,255,0.4)" }
          }
        />
      ))}
    </div>
  );
}

/** Enemy HP: wide translucent-track bar with a diamond cap (Play Screen mockup). */
export function EnemyHpBar({ total, remaining }: { total: number; remaining: number }) {
  const pct = total === 0 ? 0 : (remaining / total) * 100;
  return (
    <div className="flex w-full items-center" aria-label={`Enemy HP ${remaining} of ${total}`}>
      <div
        className="z-10 h-6 w-6 shrink-0 -mr-2.5 rotate-45 rounded-[4px]"
        style={{
          background: "linear-gradient(135deg, #ff7a6e, var(--color-hp))",
          border: "2.5px solid var(--color-hp-deep)",
        }}
      />
      <div
        className="h-3.5 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.28)" }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-400"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(180deg, #ff8d82 0%, var(--color-hp) 55%, var(--color-hp-deep) 100%)",
          }}
        />
      </div>
    </div>
  );
}
