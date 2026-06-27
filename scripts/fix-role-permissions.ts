/**
 * Updates ALL users in Supabase whose role is manager or office_manager
 * to have the correct permissions from rolePermissions.ts.
 * Safe to re-run.
 *
 * Usage:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   npx tsx scripts/fix-role-permissions.ts
 */

import { createClient } from "@supabase/supabase-js";
import { rolePermissions } from "../src/app/data/rolePermissions";

const SUPABASE_URL = "https://dbximhtxzeqiqisfadaq.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ROLES_TO_FIX = ["manager", "office_manager"] as const;

async function main() {
  for (const role of ROLES_TO_FIX) {
    const permissions = rolePermissions[role];

    // Fetch all profiles with this role
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("role", role);

    if (error) {
      console.error(`Failed to fetch ${role} profiles:`, error.message);
      continue;
    }

    console.log(`Updating ${data.length} users with role: ${role}`);

    // Batch update permissions
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ permissions })
      .eq("role", role);

    if (updateError) {
      console.error(`  x Update failed for ${role}:`, updateError.message);
    } else {
      console.log(`  ✓ ${data.length} users updated`);
    }
  }

  console.log("\nNew permissions:");
  for (const role of ROLES_TO_FIX) {
    console.log(`\n  ${role}:`);
    rolePermissions[role].forEach((p) => console.log(`    - ${p}`));
  }
}

main().catch(console.error);
