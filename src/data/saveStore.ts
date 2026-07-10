// SaveStore — where the game engine's state document lives. The engine
// (LocalGameApi) runs the same canonical math either way; only persistence
// differs: localStorage for the local demo, Supabase (player_saves.doc jsonb)
// for signed-in cloud play. Cloud saves are last-write-wins per user (§15).

export interface SaveStore {
  load(): Promise<string | null>;
  /** Fire-and-forget friendly; implementations coalesce rapid saves. */
  save(serialized: string): void;
  clear(): Promise<void>;
}

const LOCAL_KEY = "versuz:v3:local";

export class LocalSaveStore implements SaveStore {
  async load(): Promise<string | null> {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(LOCAL_KEY);
  }

  save(serialized: string): void {
    localStorage.setItem(LOCAL_KEY, serialized);
  }

  async clear(): Promise<void> {
    localStorage.removeItem(LOCAL_KEY);
  }
}
