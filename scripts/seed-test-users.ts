/**
 * Seeds the 9 dev/test accounts into Supabase so they work on the live app.
 * Safe to re-run — uses upsert for profiles and skips existing auth users.
 *
 * Usage:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   npx tsx scripts/seed-test-users.ts
 */

import { createClient } from "@supabase/supabase-js";
import { DEV_TEST_USERS } from "../src/app/data/testUsers";

const SUPABASE_URL = "https://dbximhtxzeqiqisfadaq.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Seeding ${DEV_TEST_USERS.length} test users into Supabase...\n`);

  for (const user of DEV_TEST_USERS) {
    const email = `${user.username}@asroc.local`;

    // 1. Create auth user (skip if already exists)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: user.password,
      email_confirm: true,
    });

    let authId: string;

    if (authError) {
      if (authError.message.includes("already") || authError.message.includes("exists")) {
        // Fetch existing user id
        const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 9999 });
        const found = existing?.users.find((u) => u.email === email);
        if (!found) {
          console.error(`  x Could not find existing user: ${email}`);
          continue;
        }
        authId = found.id;
        // Update password for existing user
        await supabase.auth.admin.updateUserById(authId, { password: user.password });
        console.log(`  ~ Updated: ${user.username} (${user.role})`);
      } else {
        console.error(`  x Auth failed [${user.username}]: ${authError.message}`);
        continue;
      }
    } else {
      authId = authData.user.id;
      console.log(`  + Created: ${user.username} (${user.role})`);
    }

    // 2. Upsert profile
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authId,
      username: user.username,
      name: user.name,
      financial_number: user.financialNumber ?? null,
      job_title: user.jobTitle ?? null,
      work_place: user.workPlace ?? null,
      department: user.department ?? null,
      role: user.role,
      permissions: user.permissions,
      is_active: true,
    });

    if (profileError) {
      console.error(`  x Profile failed [${user.username}]: ${profileError.message}`);
    }
  }

  console.log("\n──────────────────────────────────────");
  console.log("Test users ready. Login credentials:");
  console.log("──────────────────────────────────────");
  for (const u of DEV_TEST_USERS) {
    console.log(`  ${u.role.padEnd(15)} │ user: ${u.username.padEnd(15)} │ pass: ${u.password}`);
  }
  console.log("──────────────────────────────────────");
}

main().catch(console.error);
