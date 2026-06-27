// Minimal Supabase shim so the app compiles even if supabase dependencies
// and env vars are not installed/configured.
//
// Pages that use `supabase.from(...).select(...)` will fail at runtime until
// you install @supabase/supabase-js and add VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.

// A minimal thenable builder so code can chain calls like
// supabase.from('users').select('*').order('created_at') and also
// `await` the result. When Supabase isn't configured this resolves
// to a uniform error object.
type FromBuilder = {
  select: (...args: any[]) => FromBuilder;
  order: (...args: any[]) => FromBuilder;
  limit: (...args: any[]) => FromBuilder;
  insert: (...args: any[]) => FromBuilder;
  update: (...args: any[]) => FromBuilder;
  delete: (...args: any[]) => FromBuilder;
  then: (onfulfilled?: (value: any) => any, onrejected?: (err: any) => any) => Promise<any>;
};

type SupabaseClient = {
  from: (table: string) => FromBuilder;
};

const notConfigured = async () => {
  return { data: null, error: { message: "Supabase not configured (missing @supabase/supabase-js or env vars)." } as const };
};

const builder: FromBuilder = {
  select: () => builder,
  order: () => builder,
  limit: () => builder,
  insert: () => builder,
  update: () => builder,
  delete: () => builder,
  then(onfulfilled?: (value: any) => any, onrejected?: (err: any) => any) {
    return notConfigured().then(onfulfilled, onrejected);
  },
};

export const supabase: SupabaseClient = {
  from: () => builder,
};


