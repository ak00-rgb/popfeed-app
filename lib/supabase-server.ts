// lib/supabase-server.ts

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies(); // ✅ await here

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (key) => cookieStore.get(key)?.value,
        set: (key, value, options) => {
          try {
            cookieStore.set(key, value, options);
          } catch {
            // Ignore errors in edge runtime
          }
        },
        remove: (key, options) => {
          try {
            cookieStore.set(key, '', { ...options, maxAge: 0 });
          } catch {
            // Ignore errors in edge runtime
          }
        },
      },
    }
  );
};
