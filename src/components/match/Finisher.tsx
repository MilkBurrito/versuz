"use client";

// §5 reference finisher — the finishing blow: name the reference. The reference
// nameplate is HIDDEN on this step (v1.2: the reference is the answer).
// Multiple-choice at L1–3, typed at L4–7; ranges accepted for passage tiles.
// Non-punishing: a miss only forfeits the flawless bonus.

import { useState } from "react";
import { TEXT } from "@/copy/strings";
import { displayRef, referenceAnswerMatches } from "@/lib/refs";
import { CheckButton } from "@/components/ui/Button";

// Plausible-reference pool for multiple-choice decoys.
const DECOY_REFS = [
  "JHN.3.16", "ROM.3.23", "PSA.23.1", "PHP.4.6", "GEN.1.1", "ROM.8.28",
  "PRO.3.5", "ISA.41.10", "MAT.6.33", "JHN.14.6", "EPH.2.8", "1JN.1.9",
];

export function Finisher({
  verseId,
  mode,
  onFinish,
}: {
  verseId: string;
  mode: "choice" | "typed";
  onFinish: (correct: boolean) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-4 text-center text-[14px] font-bold text-ink-soft">
        {TEXT.match.finisherPrompt}
      </p>
      {mode === "choice" ? (
        <ChoiceFinisher verseId={verseId} onFinish={onFinish} />
      ) : (
        <TypedFinisher verseId={verseId} onFinish={onFinish} />
      )}
    </div>
  );
}

function ChoiceFinisher({
  verseId,
  onFinish,
}: {
  verseId: string;
  onFinish: (correct: boolean) => void;
}) {
  // Options shuffled once on mount (lazy initializer keeps render pure).
  const [options] = useState<string[]>(() => {
    const decoys = DECOY_REFS.filter((r) => r !== verseId)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [...decoys, verseId].sort(() => Math.random() - 0.5);
  });
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <div className="grid flex-1 grid-cols-2 content-start gap-2.5">
      {options.map((opt) => {
        const isPicked = picked === opt;
        const revealed = picked !== null;
        const isAnswer = opt === verseId;
        return (
          <button
            key={opt}
            disabled={revealed}
            onClick={() => {
              setPicked(opt);
              setTimeout(() => onFinish(opt === verseId), 650);
            }}
            className={`rounded-2xl border-2 px-3 py-4 font-serif text-[16px] transition-colors ${
              revealed && isAnswer
                ? "border-ok bg-ok-wash text-ok"
                : revealed && isPicked
                  ? "border-bad bg-bad-wash text-bad"
                  : "border-shell-deep/40 bg-white text-ink active:bg-shell"
            }`}
          >
            {displayRef(opt)}
          </button>
        );
      })}
    </div>
  );
}

function TypedFinisher({
  verseId,
  onFinish,
}: {
  verseId: string;
  onFinish: (correct: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<null | boolean>(null);
  // The example must never be the answer (it literally was, for John 3:16).
  const [example] = useState(
    () => DECOY_REFS.find((r) => r !== verseId) ?? "GEN.1.1",
  );

  function submit() {
    const correct = referenceAnswerMatches(verseId, value);
    setResult(correct);
    setTimeout(() => onFinish(correct), 800);
  }

  return (
    <div className="flex flex-1 flex-col">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={`e.g. ${displayRef(example)}`}
        autoFocus
        disabled={result !== null}
        onKeyDown={(e) => e.key === "Enter" && value.trim() && result === null && submit()}
        className={`w-full rounded-2xl border-2 px-4 py-4 font-serif text-[18px] outline-none ${
          result === null
            ? "border-shell-deep/40 focus:border-gold"
            : result
              ? "border-ok bg-ok-wash text-ok"
              : "border-bad bg-bad-wash text-bad"
        }`}
      />
      {result === false && (
        <p className="mt-2 text-center font-serif text-[14px] text-ink-soft">
          It was {displayRef(verseId)} — the win stands, the flawless bonus slips away.
        </p>
      )}
      <div className="flex-1" />
      <CheckButton disabled={!value.trim() || result !== null} onClick={submit} label="Finish" />
    </div>
  );
}
