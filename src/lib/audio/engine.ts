// The audio engine — one module owns every sound the app makes.
//
// Deliberately plain HTMLAudioElement rather than Web Audio: the app needs
// "play this short file" and "loop one track", nothing that warrants an
// AudioContext graph, and <audio> streams long music instead of decoding all
// 5 MB into memory first.
//
// MUSIC USES EXACTLY ONE ELEMENT, REUSED FOREVER. Changing track swaps its
// `src`, so two pieces of music physically cannot sound at once — the earlier
// design created a fresh element per track and leaned on a fade-out to stop
// the old one, which left room for an orphan to keep playing (Alex heard home
// and battle music together). A single element makes that class of bug
// impossible rather than merely unlikely.
//
// Browsers block audio until the user has interacted with the page, so the
// first real gesture unlocks playback and any music requested in the meantime
// starts then (see `unlock`). Nothing here throws into the app: a rejected
// play() is a no-op, never a crash mid-match.

import { BATTLE_TRACKS, HOME_TRACKS, SFX_SOURCES, type MusicTrack } from "@/config/audio.generated";

export type MusicContext = "app" | "battle";

const MUSIC_VOLUME = 0.35; // background, never competing with the effects
const SFX_VOLUME = 0.7;
const FADE_MS = 600;
const FADE_TICK_MS = 50;

let unlocked = false;
let musicEnabled = true;
let sfxEnabled = true;

/** The one and only music element. */
let musicEl: HTMLAudioElement | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
/** Bumped on every switch so a superseded one bails out mid-flight. */
let switchToken = 0;

let currentContext: MusicContext | null = null;
let currentTrackId: string | null = null;
/** Set while locked, so the first gesture can start what was requested. */
let pendingContext: MusicContext | null = null;
/** True while the tab is hidden — music is paused, not stopped. */
let backgrounded = false;

// Short effects are cached per source and cloned to allow overlaps.
const sfxCache = new Map<string, HTMLAudioElement>();

function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]!;
}

function tracksFor(context: MusicContext): MusicTrack[] {
  return context === "battle" ? BATTLE_TRACKS : HOME_TRACKS;
}

function ensureEl(): HTMLAudioElement {
  if (!musicEl) {
    musicEl = new Audio();
    musicEl.loop = true;
    musicEl.preload = "auto";
    musicEl.volume = 0;
  }
  return musicEl;
}

function clearFade(): void {
  if (fadeTimer) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

/** Ramp the single element's volume; resolves when it arrives. */
function fadeTo(target: number): Promise<void> {
  clearFade();
  const el = ensureEl();
  return new Promise((resolve) => {
    const steps = Math.max(1, Math.round(FADE_MS / FADE_TICK_MS));
    const step = (target - el.volume) / steps;
    if (step === 0) {
      el.volume = target;
      resolve();
      return;
    }
    fadeTimer = setInterval(() => {
      const next = el.volume + step;
      const done = step > 0 ? next >= target : next <= target;
      el.volume = Math.min(1, Math.max(0, done ? target : next));
      if (done) {
        clearFade();
        resolve();
      }
    }, FADE_TICK_MS);
  });
}

async function switchTrack(track: MusicTrack): Promise<void> {
  const token = ++switchToken;
  const el = ensureEl();

  // Fade the outgoing track down before swapping the source.
  if (el.src && !el.paused) {
    await fadeTo(0);
    if (token !== switchToken) return; // a newer switch took over
  }

  clearFade();
  el.pause();
  el.src = track.src;
  el.volume = 0;
  currentTrackId = track.id;

  if (backgrounded) return; // resumed by setPageHidden when the tab returns
  try {
    await el.play();
  } catch (err) {
    // Our own pause() rejects a pending play() with AbortError — that is NOT
    // the browser blocking autoplay, and must not re-lock the engine.
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      unlocked = false;
      pendingContext = currentContext;
    }
    return;
  }
  if (token !== switchToken) return;
  await fadeTo(MUSIC_VOLUME);
}

/**
 * Music follows the tab: leaving pauses it (keeping the track and position),
 * coming back resumes. Nobody wants a hymn playing from a tab they left an
 * hour ago.
 */
export function setPageHidden(hidden: boolean): void {
  backgrounded = hidden;
  if (!musicEl) return;
  if (hidden) {
    clearFade();
    musicEl.pause();
  } else if (musicEnabled && unlocked && musicEl.src) {
    void musicEl.play().then(
      () => fadeTo(MUSIC_VOLUME),
      () => {},
    );
  }
}

/** Call from a real user gesture (a tap/click). Safe to call repeatedly. */
export function unlock(): void {
  unlocked = true;
  if (pendingContext) {
    const next = pendingContext;
    pendingContext = null;
    playMusic(next, { force: true });
  }
}

export function setMusicEnabled(on: boolean): void {
  musicEnabled = on;
  if (!on) {
    stopMusic();
  } else if (currentContext) {
    playMusic(currentContext, { force: true });
  }
}

export function setSfxEnabled(on: boolean): void {
  sfxEnabled = on;
}

/**
 * Switch the music context. Calling it with the context already playing is a
 * no-op — so navigating between Home/Explore/Settings never restarts the
 * track, and only entering or leaving a fight changes the music.
 */
export function playMusic(context: MusicContext, opts: { force?: boolean } = {}): void {
  if (!musicEnabled) {
    currentContext = context; // remembered, so re-enabling resumes correctly
    return;
  }
  if (!unlocked) {
    pendingContext = context;
    currentContext = context;
    return;
  }
  // Already in this context with a track loaded — leave it playing. (Checking
  // `paused` here would fail while loading and restart the stream, which is
  // what React StrictMode's double-mount used to trigger.)
  if (currentContext === context && !opts.force && musicEl?.src) return;

  const pool = tracksFor(context);
  // Avoid immediately repeating the track that just played, when there's a choice.
  const choices = pool.length > 1 ? pool.filter((t) => t.id !== currentTrackId) : pool;
  currentContext = context;
  void switchTrack(pick(choices.length > 0 ? choices : pool));
}

export function stopMusic(): void {
  switchToken++; // cancel anything in flight
  clearFade();
  if (musicEl) {
    musicEl.pause();
    musicEl.removeAttribute("src");
    musicEl.load(); // release the stream
    musicEl.volume = 0;
  }
  currentTrackId = null;
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
        /** Music elements in existence — must never exceed 1. */
        elements: number;
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
      volume: musicEl ? Number(musicEl.volume.toFixed(3)) : 0,
      elements: musicEl ? 1 : 0,
    }),
    playSfx,
    playMusic,
  };
}
