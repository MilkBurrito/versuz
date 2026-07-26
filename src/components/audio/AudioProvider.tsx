"use client";

// Mounts once at the root and keeps the audio engine in step with the app:
//
//  · unlocks playback on the player's first real gesture (browsers refuse
//    audio before one) and warms the short effects,
//  · mirrors the two saved preferences into the engine,
//  · decides WHICH music plays. There are exactly two contexts:
//      battle — a match is open, which by design includes the post-match
//               beats (victory / XP / streak / chest), because `match` only
//               clears when the player lands back on Home,
//      app    — everywhere else: home, explore, shop, settings, training.
//    Switching context re-rolls the track, so a home tune only changes after
//    a fight; walking between Home and Settings never restarts it.

import { useEffect } from "react";
import { useApp } from "@/state/store";
import {
  playMusic,
  preloadSfx,
  setMusicEnabled,
  setPageHidden,
  setSfxEnabled,
  unlock,
} from "@/lib/audio/engine";

export function AudioProvider() {
  const inMatch = useApp((s) => s.match !== null);
  const musicOn = useApp((s) => s.snapshot?.user.musicEnabled ?? true);
  const sfxOn = useApp((s) => s.snapshot?.user.sfxEnabled ?? true);

  // A gesture unlocks the engine (and starts any queued music). NOT `once`:
  // if the browser refuses that first play() the engine re-locks itself, and
  // a one-shot listener would leave the app permanently silent.
  useEffect(() => {
    const onGesture = () => {
      unlock();
      preloadSfx();
    };
    const opts = { passive: true } as const;
    window.addEventListener("pointerdown", onGesture, opts);
    window.addEventListener("keydown", onGesture, opts);
    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
  }, []);

  // Leaving the tab pauses the music; returning resumes it.
  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    setMusicEnabled(musicOn);
  }, [musicOn]);

  useEffect(() => {
    setSfxEnabled(sfxOn);
  }, [sfxOn]);

  useEffect(() => {
    playMusic(inMatch ? "battle" : "app");
  }, [inMatch]);

  return null;
}
