// Minimal Supabase shim so the app compiles even if supabase dependencies
// and env vars are not installed/configured.
//
// Pages that use `supabase.from(...).select(...)` will fail at runtime until
// you install @supabase/supabase-js and add VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.

type SupabaseError = { message: string } | null;

type FromBuilder = {
  select: (...args: any[]) => Promise<{ data: any; error: SupabaseError }>;
  order: (...args: any[]) => FromBuilder;
  limit: (...args: any[]) => FromBuilder;
  insert: (...args: any[]) => Promise<{ data: any; error: SupabaseError }>;
  update: (...args: any[]) => FromBuilder;
  delete: (...args: any[]) => FromBuilder;
};

type SupabaseClient = {
  from: (table: string) => FromBuilder;
};

const notConfigured = async () => {
  return { data: null, error: { message: "Supabase not configured (missing @supabase/supabase-js or env vars)." } as const };
};

const builder: FromBuilder = {
  select: notConfigured as any,
  order: () => builder,
  limit: () => builder,
  insert: notConfigured as any,
  update: () => builder,
  delete: () => builder,
};

export const supabase: SupabaseClient = {
  from: () => builder,
};


