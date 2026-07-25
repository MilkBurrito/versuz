// The audio engine — one module owns every sound the app makes.
//
// Deliberately plain HTMLAudioElement rather than Web Audio: the app needs
// "play this short file" and "loop one track", nothing that warrants an
// AudioContext graph, and <audio> streams long music instead of decoding all
// 5 MB into memory first.
//
// Browsers block audio until the user has interacted with the page, so the
// first real gesture unlocks playback and any music that was asked for in the
// meantime starts then (see `unlock`). Nothing here throws into the app: a
// rejected play() is a no-op, never a crash mid-match.

import { BATTLE_TRACKS, HOME_TRACKS, SFX_SOURCES, type MusicTrack } from "@/config/audio.generated";

export type MusicContext = "app" | "battle";

const MUSIC_VOLUME = 0.35; // background, never competing with the effects
const SFX_VOLUME = 0.7;
const FADE_MS = 600;

let unlocked = false;
let musicEnabled = true;
let sfxEnabled = true;

let musicEl: HTMLAudioElement | null = null;
let currentContext: MusicContext | null = null;
let currentTrackId: string | null = null;
/** Set while locked, so the first gesture can start what was requested. */
let pendingContext: MusicContext | null = null;

// Short effects are cached per source and cloned to allow overlaps.
const sfxCache = new Map<string, HTMLAudioElement>();

function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]!;
}

function tracksFor(context: MusicContext): MusicTrack[] {
  return context === "battle" ? BATTLE_TRACKS : HOME_TRACKS;
}

/** Call from a real user gesture (a tap/click). Safe to call repeatedly. */
export function unlock(): void {
  if (unlocked) return;
  unlocked = true;
  if (pendingContext) {
    const next = pendingContext;
    pendingContext = null;
    playMusic(next);
  }
}

export function setMusicEnabled(on: boolean): void {
  musicEnabled = on;
  if (!on) {
    stopMusic();
  } else if (currentContext) {
    // Re-enter the context we were in so the right music resumes.
    const context = currentContext;
    currentContext = null;
    playMusic(context);
  }
}

export function setSfxEnabled(on: boolean): void {
  sfxEnabled = on;
}

function fadeOutAndStop(el: HTMLAudioElement): void {
  const step = el.volume / (FADE_MS / 50);
  const id = setInterval(() => {
    const next = el.volume - step;
    if (next <= 0.01) {
      clearInterval(id);
      el.pause();
      el.src = ""; // release the stream
    } else {
      el.volume = next;
    }
  }, 50);
}

/**
 * Switch the music context. Calling it with the context already playing is a
 * no-op — so navigating between Home/Explore/Settings never restarts the
 * track, and only entering or leaving a fight changes the music.
 */
export function playMusic(context: MusicContext, opts: { reroll?: boolean } = {}): void {
  if (!musicEnabled) {
    currentContext = context; // remembered, so re-enabling resumes correctly
    return;
  }
  if (!unlocked) {
    pendingContext = context;
    currentContext = context;
    return;
  }
  // An element for this context already exists — leave it alone. (Checking
  // `paused` here would fail during loading and restart the stream, which is
  // exactly what React StrictMode's double-mount used to trigger.)
  if (currentContext === context && !opts.reroll && musicEl) return;

  const pool = tracksFor(context);
  // Avoid immediately repeating the track that just played, when there's a choice.
  const choices = pool.length > 1 ? pool.filter((t) => t.id !== currentTrackId) : pool;
  const track = pick(choices.length > 0 ? choices : pool);

  if (musicEl) fadeOutAndStop(musicEl);

  const el = new Audio(track.src);
  el.loop = true;
  el.volume = 0;
  el.preload = "auto";
  musicEl = el;
  currentContext = context;
  currentTrackId = track.id;

  void el.play().then(
    () => {
      // Fade in so a track never slams in at full volume.
      const step = MUSIC_VOLUME / (FADE_MS / 50);
      const id = setInterval(() => {
        if (musicEl !== el) return clearInterval(id);
        const next = el.volume + step;
        if (next >= MUSIC_VOLUME) {
          el.volume = MUSIC_VOLUME;
          clearInterval(id);
        } else {
          el.volume = next;
        }
      }, 50);
    },
    () => {
      // Autoplay refused (no gesture yet) — drop the element so the retry
      // after the next gesture isn't blocked by the guard above.
      if (musicEl === el) musicEl = null;
      unlocked = false;
      pendingContext = context;
    },
  );
}

export function stopMusic(): void {
  if (musicEl) {
    fadeOutAndStop(musicEl);
    musicEl = null;
  }
}

/** Play a one-shot effect. Unknown ids and blocked playback are ignored. */
export function playSfx(id: keyof typeof SFX_SOURCES | string, volume = SFX_VOLUME): void {
  if (!sfxEnabled || !unlocked) return;
  const sources = SFX_SOURCES[id];
  if (!sources || sources.length === 0) return;
  const src = pick(sources);

  let base = sfxCache.get(src);
  if (!base) {
    base = new Audio(src);
    base.preload = "auto";
    sfxCache.set(src, base);
  }
  // Clone so rapid repeats overlap instead of cutting each other off.
  const el = base.cloneNode() as HTMLAudioElement;
  el.volume = volume;
  void el.play().catch(() => {});
}

/** Warm the short effects so the first hit isn't silent. */
export function preloadSfx(): void {
  for (const sources of Object.values(SFX_SOURCES)) {
    for (const src of sources) {
      if (sfxCache.has(src)) continue;
      const el = new Audio(src);
      el.preload = "auto";
      sfxCache.set(src, el);
    }
  }
}

// Dev handle: inspect/drive audio from the console (mirrors window.__vz).
declare global {
  interface Window {
    __vzAudio?: {
      state: () => {
        unlocked: boolean;
        musicEnabled: boolean;
        sfxEnabled: boolean;
        context: MusicContext | null;
        track: string | null;
        playing: boolean;
        volume: number;
      };
      playSfx: typeof playSfx;
      playMusic: typeof playMusic;
    };
  }
}
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.__vzAudio = {
    state: () => ({
      unlocked,
      musicEnabled,
      sfxEnabled,
      context: currentContext,
      track: currentTrackId,
      playing: !!musicEl && !musicEl.paused,
      volume: musicEl ? Number(musicEl.volume.toFixed(2)) : 0,
    }),
    playSfx,
    playMusic,
  };
}
