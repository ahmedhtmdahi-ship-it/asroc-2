import { createClient } from "@supabase/supabase-js";
import { mockUsers } from "../src/app/data/mockUsers";

const SUPABASE_URL = "https://dbximhtxzeqiqisfadaq.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Found ${mockUsers.length} users. Starting migration...\n`);

  let created = 0, skipped = 0, failed = 0;

  for (const user of mockUsers) {
    const email = `${String(user.username).trim().toLowerCase()}@asroc.local`;

    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: String(user.password),
        email_confirm: true,
      });

    if (authError) {
      if (authError.message.includes("already") || authError.message.includes("exists")) {
        skipped++;
        continue;
      }
      console.error(`  x Auth [${user.username}]: ${authError.message}`);
      failed++;
      continue;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: authData.user.id,
      username: String(user.username),
      name: user.name,
      financial_number: user.financialNumber ?? null,
      job_title: user.jobTitle ?? null,
      work_place: user.workPlace ?? null,
      department: user.department ?? null,
      national_id: user.nationalId ?? null,
      phone: user.phone ?? null,
      work_type: user.workType ?? null,
      role: user.role,
      permissions: user.permissions ?? [],
      is_active: user.isActive ?? true,
    });

    if (profileError) {
      console.error(`  x Profile [${user.username}]: ${profileError.message}`);
      failed++;
    } else {
      created++;
      if (created % 100 === 0) console.log(`  ${created} users done...`);
    }
  }

  console.log("\n──────────────────────────────");
  console.log(`Created : ${created}`);
  console.log(`Skipped : ${skipped}  (already existed)`);
  console.log(`Failed  : ${failed}`);
  console.log("──────────────────────────────");
}

main().catch(console.error);
