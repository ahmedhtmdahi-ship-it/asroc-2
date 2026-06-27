/**
 * Promotes all users with jobTitle containing "مساعد مكلف" to office_manager role.
 * Usage:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   npx tsx scripts/fix-office-managers.ts
 */
import { createClient } from "@supabase/supabase-js";
import { rolePermissions } from "../src/app/data/rolePermissions";

const supabase = createClient(
  "https://dbximhtxzeqiqisfadaq.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, financial_number, name, job_title, role")
    .ilike("job_title", "%مساعد مكلف%");

  if (error || !data) { console.error(error?.message); process.exit(1); }

  console.log(`Found ${data.length} users with "مساعد مكلف" job title:\n`);
  data.forEach(u =>
    console.log(`  ${(u.financial_number||'').padStart(6)} | ${u.role.padEnd(14)} | ${(u.name||'').substring(0,30)}`)
  );

  const ids = data.map(u => u.id);
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "office_manager", permissions: rolePermissions.office_manager })
    .in("id", ids);

  if (updateError) { console.error("Update failed:", updateError.message); process.exit(1); }

  console.log(`\n✓ ${data.length} users updated to office_manager role.`);
}

main().catch(console.error);
