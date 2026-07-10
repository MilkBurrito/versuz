// Cloud SaveStore: the player's whole game document in player_saves.doc
// (jsonb), keyed by their auth user id — sign in anywhere, same progress.
// RLS restricts every row to its owner (see supabase/migrations/0002).
// Rapid saves coalesce: one in flight, latest queued behind it.

import { supabase } from "@/lib/supabase";
import type { SaveStore } from "@/data/saveStore";

export class CloudSaveStore implements SaveStore {
  private inFlight = false;
  private pending: string | null = null;

  constructor(private readonly userId: string) {}

  async load(): Promise<string | null> {
    const { data, error } = await supabase()
      .from("player_saves")
      .select("doc")
      .eq("user_id", this.userId)
      .maybeSingle();
    if (error) throw new Error(`Cloud load failed: ${error.message}`);
    return data ? JSON.stringify(data.doc) : null;
  }

  save(serialized: string): void {
    if (this.inFlight) {
      this.pending = serialized; // latest wins once the current write lands
      return;
    }
    void this.push(serialized);
  }

  private async push(serialized: string): Promise<void> {
    this.inFlight = true;
    try {
      const { error } = await supabase()
        .from("player_saves")
        .upsert({
          user_id: this.userId,
          doc: JSON.parse(serialized),
          updated_at: new Date().toISOString(),
        });
      if (error) console.error("Cloud save failed:", error.message);
    } finally {
      this.inFlight = false;
      if (this.pending !== null) {
        const next = this.pending;
        this.pending = null;
        void this.push(next);
      }
    }
  }

  async clear(): Promise<void> {
    await supabase().from("player_saves").delete().eq("user_id", this.userId);
  }
}
