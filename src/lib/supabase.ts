// Supabase client — active only in cloud mode (all three env vars present).
// Local demo mode (no env) never touches the network.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const backend = process.env.NEXT_PUBLIC_DATA_BACKEND;

export function isCloudMode(): boolean {
  return backend === "supabase" && !!url && !!anonKey;
}

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!isCloudMode()) throw new Error("Supabase is not configured (see .env.example)");
  if (!client) client = createClient(url!, anonKey!);
  return client;
}
