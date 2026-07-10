"use client";

// Shared full-bleed overlay scaffold: dark header band (close + title) spanning
// the viewport, scrollable content centered at a readable width, optional
// footer band. Every secondary screen (profile, streak, gems, energy,
// character) sits in this shell.

import { CloseIcon } from "@/components/ui/icons";

export function OverlayShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  headerExtra,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cream">
      <div className="w-full bg-[#5b5f68] pb-4 pt-[calc(env(safe-area-inset-top)+10px)]">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-2 text-white/85 active:bg-white/10"
            >
              <CloseIcon size={20} />
            </button>
            <div>
              <h2 className="text-[16px] font-extrabold text-white">{title}</h2>
              {subtitle && <p className="text-[11px] font-bold text-white/70">{subtitle}</p>}
            </div>
          </div>
          {headerExtra}
        </div>
      </div>

      <div className="w-full flex-1 overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <div className="mx-auto w-full max-w-xl">{children}</div>
      </div>

      {footer && (
        <div className="w-full border-t border-black/5 bg-white pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
          <div className="mx-auto w-full max-w-md px-5">{footer}</div>
        </div>
      )}
    </div>
  );
}

/** Small stat/setting row used across the new screens. */
export function InfoRow({
  label,
  value,
  dim,
}: {
  label: string;
  value: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className={`text-[13px] font-bold ${dim ? "text-ink-faint" : "text-ink-soft"}`}>
        {label}
      </span>
      <span className="text-[13px] font-extrabold text-ink">{value}</span>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${className}`}>
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 mt-5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink-faint first:mt-0">
      {children}
    </h3>
  );
}
