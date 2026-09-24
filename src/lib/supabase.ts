/**
 * Local persistence adapter.
 *
 * The shared claims API uses Supabase as the only canonical data source.
 *
 * When a real database is needed in the future:
 *   - Replace the functions below with API calls.
 *   - Keep the same exported interface so no other files change.
 *
 * Security: no secrets are required or used here. The anon key and URL
 * env vars have been removed from this project.
 */

export const LOCAL_STORE_VERSION = "v1";
export const LOCAL_STORE_LABEL = "Shared Supabase store";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      (process.env.SUPABASE_PUBLISHABLE_KEY ??
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

/** Returns a human-readable label for the current data source. */
export function dataSourceLabel(): string {
  return "Shared through Supabase";
}
