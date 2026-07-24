"use client";

// First-run induction into the King's Guard (Build Brief Phase 1.2).
// Three short beats in the Kingdom's voice — arrival at the Temple, receiving
// the living Sword, learning that it is wielded by heart — then straight into
// play. Shown once (user.onboardingCompleted persists it).

import { useState } from "react";
import { useApp } from "@/state/store";
import { TEXT } from "@/copy/strings";
import { Button } from "@/components/ui/Button";
import { characterById, SpriteAnimator } from "@/components/sprites/SpriteAnimator";
import { PixelIcon } from "@/components/ui/icons";

export function OnboardingScreen() {
  const { completeOnboarding, snapshot } = useApp();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const steps = TEXT.onboarding.steps;
  const beat = steps[step]!;
  const last = step === steps.length - 1;
  const hero = characterById(snapshot?.user.characterSprite);

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#1d2329] px-8 text-center">
      <div className="flex w-full max-w-sm flex-col items-center">
        {/* one emblem per beat: flame → sword icon → the Guard themselves */}
        <div className="flex h-[140px] items-center justify-center overflow-visible">
          {step === 0 && <PixelIcon name="lantern" size={96} alt="The Everflame" />}
          {step === 1 && <PixelIcon name="slot-weapon" size={96} alt="The living Sword" />}
          {step === 2 && (
            <SpriteAnimator sprite={hero.sprite} anim="idle" size={140} playKey={1} />
          )}
        </div>

        <h1 className="mt-6 text-[24px] font-extrabold leading-tight text-white">{beat.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-white/75">{beat.body}</p>

        {/* beat dots */}
        <div className="mt-6 flex gap-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${i === step ? "bg-gold" : "bg-white/25"}`}
            />
          ))}
        </div>

        <Button
          className="mt-8 w-full"
          disabled={busy}
          onClick={async () => {
            if (!last) {
              setStep(step + 1);
              return;
            }
            setBusy(true);
            try {
              await completeOnboarding();
            } finally {
              setBusy(false);
            }
          }}
        >
          {last ? TEXT.onboarding.cta : TEXT.onboarding.next}
        </Button>
      </div>
    </div>
  );
}
