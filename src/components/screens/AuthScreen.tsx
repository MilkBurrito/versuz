"use client";

// Email + password sign-in / sign-up (cloud mode). Progress lives in the
// player's cloud save, so signing in on any browser resumes the same journey.
// Apple/Google OAuth are a later pass (they need provider app registrations).

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/state/store";
import { Button } from "@/components/ui/Button";
import { PixelIcon } from "@/components/ui/icons";

type Mode = "signin" | "signup";

export function AuthScreen() {
  const { init } = useApp();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase().auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          // Email confirmation is on — the session arrives after they confirm.
          setNotice("Almost in — check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await init(true); // bind the engine to this user's cloud save
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <PixelIcon name="nav-explore" size={56} alt="" />
          <h1 className="mt-3 text-[28px] font-extrabold text-ink">Versuz</h1>
          <p className="mt-1 text-[14px] font-bold text-ink-soft">
            Battle the dark with the Word.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <div className="mb-4 flex gap-1 rounded-xl bg-shell p-1">
            {(
              [
                ["signin", "Sign in"],
                ["signup", "Create account"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                }}
                className={`flex-1 rounded-lg py-2 text-[13px] font-extrabold transition-colors ${
                  mode === m ? "bg-gold text-gold-dark shadow-sm" : "text-ink-soft"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            className="mb-3 w-full rounded-2xl border-2 border-shell-deep/40 px-4 py-3 text-[15px] outline-none focus:border-gold"
          />
          <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wide text-ink-faint">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "8+ characters" : "••••••••"}
            onKeyDown={(e) => e.key === "Enter" && email && password && !busy && submit()}
            className="mb-4 w-full rounded-2xl border-2 border-shell-deep/40 px-4 py-3 text-[15px] outline-none focus:border-gold"
          />

          {error && <p className="mb-3 text-center text-[12px] font-bold text-bad">{error}</p>}
          {notice && <p className="mb-3 text-center text-[12px] font-bold text-ok">{notice}</p>}

          <Button
            className="w-full"
            disabled={busy || !email.trim() || password.length < 6}
            onClick={submit}
          >
            {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </div>

        <p className="mt-4 text-center text-[11px] font-bold text-ink-faint">
          Your verses and progress follow your account — any browser, anywhere.
        </p>
      </div>
    </main>
  );
}
