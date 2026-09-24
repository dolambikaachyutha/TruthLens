/**
 * Local persistence adapter.
 *
 * All claim data is stored in browser localStorage under versioned keys.
 * This file replaces the former Supabase client.
 *
 * When a real database is needed in the future:
 *   - Replace the functions below with API calls.
 *   - Keep the same exported interface so no other files change.
 *
 * Security: no secrets are required or used here. The anon key and URL
 * env vars have been removed from this project.
 */

export const LOCAL_STORE_VERSION = "v1";
export const LOCAL_STORE_LABEL = "Device-local store";

/** Always false — Supabase is not used in this build. */
export function isSupabaseConfigured(): boolean {
  return false;
}

/** Returns a human-readable label for the current data source. */
export function dataSourceLabel(): string {
  return "Stored on this device (localStorage)";
}
