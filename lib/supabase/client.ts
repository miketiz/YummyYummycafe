import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    publicKey!
  );
}
