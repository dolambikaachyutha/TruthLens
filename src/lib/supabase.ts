/**
 * Local persistence adapter.
 *
 * The shared claims API uses Supabase when configured and data/claims.json
 * during local development without Supabase credentials.
 *
 * When a real database is needed in the future:
 *   - Replace the functions below with API calls.
 *   - Keep the same exported interface so no other files change.
 *
 * Security: no secrets are required or used here. The anon key and URL
 * env vars have been removed from this project.
 */

export const LOCAL_STORE_VERSION = "v1";
export const LOCAL_STORE_LABEL = "Shared claims store";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** Returns a human-readable label for the current data source. */
export function dataSourceLabel(): string {
  return isSupabaseConfigured()
    ? "Shared through Supabase"
    : "Shared by this local server";
}
