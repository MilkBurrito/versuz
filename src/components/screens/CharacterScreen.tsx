"use client";

// Character screen (tap the hero, or Profile → Change Character): display name
// + selectable character sprite. Gender / skin tone / hair are shown as
// blocked-out future options until per-variant art exists (spec §10-B).

import { useState } from "react";
import { useApp } from "@/state/store";
import { Button } from "@/components/ui/Button";
import { LockIcon } from "@/components/ui/icons";
import { characterById, PLAYER_CHARACTERS, SpriteAnimator } from "@/components/sprites/SpriteAnimator";
import { Card, OverlayShell, SectionLabel } from "@/components/screens/OverlayShell";

export function CharacterScreen({ onClose }: { onClose: () => void }) {
  const { snapshot, saveCharacter } = useApp();
  const [name, setName] = useState(snapshot?.user.displayName ?? "");
  // characterById migrates any legacy sprite id to a valid Elemental.
  const [spriteId, setSpriteId] = useState(characterById(snapshot?.user.characterSprite).id);
  const [busy, setBusy] = useState(false);
  if (!snapshot) return null;

  const dirty =
    name.trim() !== snapshot.user.displayName || spriteId !== snapshot.user.characterSprite;

  return (
    <OverlayShell
      title="Your Character"
      subtitle="The clumsy hero — the Word does the heavy lifting"
      onClose={onClose}
      footer={
        <Button
          className="w-full"
          disabled={!dirty || busy || name.trim() === ""}
          onClick={async () => {
            setBusy(true);
            try {
              await saveCharacter(name, spriteId);
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          Save
        </Button>
      }
    >
      <SectionLabel>Name</SectionLabel>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
        placeholder="Hero name"
        className="w-full rounded-2xl border-2 border-shell-deep/40 bg-white px-4 py-3 text-[15px] font-bold text-ink outline-none focus:border-gold"
      />

      <SectionLabel>Character</SectionLabel>
      {/* big animated preview of the current pick */}
      <div className="flex h-[170px] items-center justify-center overflow-visible">
        <SpriteAnimator
          key={spriteId}
          sprite={PLAYER_CHARACTERS.find((c) => c.id === spriteId)!.sprite}
          anim="idle"
          size={160}
        />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {PLAYER_CHARACTERS.map((c) => {
          const selected = c.id === spriteId;
          return (
            <button
              key={c.id}
              onClick={() => setSpriteId(c.id)}
              title={c.name}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 bg-white p-1.5 transition-transform active:scale-95 ${
                selected ? "border-gold-deep bg-gold-wash" : "border-shell-deep/30"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.portrait} width={44} height={44} alt={c.name} className="pixelated rounded-lg" draggable={false} />
              <span className={`w-full truncate text-center text-[9px] font-extrabold ${selected ? "text-gold-deep" : "text-ink-soft"}`}>
                {c.name}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-1 text-[11px] font-bold text-ink-faint">
        Your pick stands on the hub, fights your matches, and their face becomes your profile icon.
      </p>

      <SectionLabel>Appearance · coming soon</SectionLabel>
      <div className="flex flex-col gap-2">
        <FutureOption label="Gender" preview="Man · Woman" />
        <FutureOption label="Skin tone" preview={<Swatches colors={["#f3d3b3", "#d9a066", "#8d5524"]} />} />
        <FutureOption label="Hair" preview="3 styles" />
      </div>
    </OverlayShell>
  );
}

function FutureOption({ label, preview }: { label: string; preview: React.ReactNode }) {
  return (
    <Card className="flex items-center justify-between opacity-60">
      <span className="text-[13px] font-bold text-ink-soft">{label}</span>
      <span className="flex items-center gap-2 text-[12px] font-bold text-ink-faint">
        {preview}
        <LockIcon size={14} />
      </span>
    </Card>
  );
}

function Swatches({ colors }: { colors: string[] }) {
  return (
    <span className="flex gap-1">
      {colors.map((c) => (
        <span key={c} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />
      ))}
    </span>
  );
}
