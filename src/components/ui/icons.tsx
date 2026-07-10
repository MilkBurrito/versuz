// Icons come in two tiers:
//  · PixelIcon — 64×64 Raven Fantasy icons (public/icons/) for game-y surfaces
//    (status bar, nav, equip slots/items, rewards).
//  · SVG glyphs below — utility chrome only (close, trash, lock) where a
//    single-color mark reads better than pixel art.

/* eslint-disable @next/next/no-img-element */
export function PixelIcon({
  name,
  size = 22,
  className = "",
  alt = "",
}: {
  /** File name under public/icons/ui (without extension), e.g. "nav-home". */
  name: string;
  size?: number;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={`/icons/ui/${name}.png`}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt === ""}
      className={`pixelated inline-block ${className}`}
      draggable={false}
    />
  );
}

interface IconProps {
  size?: number;
  className?: string;
}

function Svg({ size = 20, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function PersonIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="7.5" r="4.5" />
      <path d="M3.5 21c0-4.1 3.8-6.8 8.5-6.8s8.5 2.7 8.5 6.8v.5h-17z" />
    </Svg>
  );
}

export function FlameIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5c.6 3.4-1.6 5-3.1 6.8C7.3 11.2 6 13 6 15.4 6 19 8.7 21.5 12 21.5s6-2.5 6-6.1c0-3.5-2.2-5.2-3.4-7.5-.7-1.4-1-3-.6-5.4-1 .4-1.7 1-2 3z" />
      <path d="M12 21.5c-1.9 0-3.4-1.5-3.4-3.5 0-1.9 1.4-2.8 2.3-4 .5-.7.9-1.4 1-2.4 1.5 1.3 3.5 3 3.5 6 0 2.1-1.5 3.9-3.4 3.9z" fill="#fff" fillOpacity="0.35" />
    </Svg>
  );
}

export function CoinIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="12" cy="8" rx="8.5" ry="4.4" />
      <path d="M3.5 8v7.5c0 2.5 3.8 4.5 8.5 4.5s8.5-2 8.5-4.5V8c0 2.5-3.8 4.4-8.5 4.4S3.5 10.5 3.5 8z" />
      <ellipse cx="12" cy="8" rx="5" ry="2.3" fill="#fff" fillOpacity="0.3" />
    </Svg>
  );
}

export function BoltIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13.6 2 5 13.4h5.1L9 22l8.7-11.4h-5.2z" />
    </Svg>
  );
}

export function SwordIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M19.7 3.1 10 12.8l1.9 1.9 9.6-9.7.3-2.2zM8.8 14 7 12.2l-1.6 1.6 1 1-2.9 2.9-.9 3.4 3.4-.9 2.9-2.9 1 1 1.6-1.6z" />
    </Svg>
  );
}

export function ShirtIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.5 3.5 3 6.8l1.8 3.6 2-.9V20.5h10.4V9.5l2 .9L21 6.8l-5.5-3.3c-.4 1.3-1.8 2.3-3.5 2.3s-3.1-1-3.5-2.3z" />
    </Svg>
  );
}

export function PantsIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6.5 3h11l1 18h-5l-1.5-9.5L10.5 21h-5z" />
    </Svg>
  );
}

export function BootIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 3h6v9.5c3.8 0 7.5 2 7.5 5V21H4.5v-4L7 14z" />
    </Svg>
  );
}

export function LockIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 10V7.5C7 4.7 9.2 2.5 12 2.5s5 2.2 5 5V10h1.2v11H5.8V10zm2.4 0h5.2V7.5c0-1.5-1.1-2.6-2.6-2.6s-2.6 1.1-2.6 2.6z" />
    </Svg>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.5 3h5l.7 1.5H20V7H4V4.5h4.8zM5.5 8.5h13L17.5 21.5h-11z" />
    </Svg>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5.4 3.7 12 10.3l6.6-6.6 1.7 1.7L13.7 12l6.6 6.6-1.7 1.7-6.6-6.6-6.6 6.6-1.7-1.7L10.3 12 3.7 5.4z" />
    </Svg>
  );
}

export function ChestIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6.5C4 5.1 5.1 4 6.5 4h11C18.9 4 20 5.1 20 6.5V10H4z" />
      <path d="M4 11.5h6.5v2h3v-2H20V20H4z" />
      <rect x="10.9" y="9" width="2.2" height="3.6" rx="0.6" fill="#fff" fillOpacity="0.5" />
    </Svg>
  );
}

/** Faceted currency gem (blue, to stay distinct from the green journey gems). */
export function CurrencyGemIcon({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M7 3h10l4 6-9 12L3 9z"
        fill="#4f8fe8"
        stroke="#2b62b8"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M7 3 12 9l5-6z" fill="#fff" fillOpacity="0.4" />
      <path d="M3 9h9L12 21z" fill="#000" fillOpacity="0.15" />
    </svg>
  );
}

/** Faceted gem (the level-journey node jewel). */
export function GemIcon({ size = 24, className, lit = true }: IconProps & { lit?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 2 21 9.2 12 22 3 9.2z"
        fill={lit ? "var(--color-gem)" : "#8b8f99"}
        stroke={lit ? "var(--color-gem-deep)" : "#6d717b"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M12 2 8 9.2h8z" fill="#fff" fillOpacity={lit ? 0.42 : 0.2} />
      <path d="M3 9.2h5L12 22z" fill="#000" fillOpacity="0.16" />
    </svg>
  );
}
