// Gold nameplate banner with diamond ends — the mockups' signature chrome
// (player name on the hub, verse reference on the overlay + match screen).

export function Nameplate({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Diamond side="left" />
      <div
        className="relative z-10 px-4 py-1.5 text-[13px] font-bold uppercase tracking-wide text-gold-dark"
        style={{
          background: "linear-gradient(180deg, var(--color-gold-soft) 0%, var(--color-gold) 55%, var(--color-gold-deep) 100%)",
          border: "2px solid var(--color-gold-deep)",
          borderRadius: 6,
          boxShadow: "0 2px 0 rgba(109, 79, 16, 0.35)",
        }}
      >
        {children}
      </div>
      <Diamond side="right" />
    </div>
  );
}

function Diamond({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`relative z-0 h-5 w-5 shrink-0 rotate-45 ${side === "left" ? "-mr-3" : "-ml-3"}`}
      style={{
        background: "linear-gradient(135deg, var(--color-gold-soft), var(--color-gold-deep))",
        border: "2px solid var(--color-gold-deep)",
        borderRadius: 3,
        boxShadow: "0 2px 0 rgba(109, 79, 16, 0.3)",
      }}
    />
  );
}
