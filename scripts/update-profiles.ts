import { createClient } from "@supabase/supabase-js";
import { mockUsers } from "../src/app/data/mockUsers";

const SUPABASE_URL = "https://dbximhtxzeqiqisfadaq.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Updating profiles for ${mockUsers.length} users...`);

  // Fetch all auth users to map username→id
  const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers({ perPage: 9999 });
  if (listError || !authUsers) {
    console.error("Failed to list auth users:", listError?.message);
    process.exit(1);
  }

  const emailToId = new Map(authUsers.users.map((u) => [u.email, u.id]));

  let updated = 0;
  let notFound = 0;
  let failed = 0;

  for (const user of mockUsers) {
    const email = `${String(user.username).trim().toLowerCase()}@asroc.local`;
    const authId = emailToId.get(email);

    if (!authId) {
      notFound++;
      continue;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: authId,
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

    if (error) {
      console.error(`  x Profile [${user.username}]: ${error.message}`);
      failed++;
    } else {
      updated++;
      if (updated % 200 === 0) console.log(`  ${updated} profiles updated...`);
    }
  }

  console.log("\n──────────────────────────────");
  console.log(`Updated  : ${updated}`);
  console.log(`NotFound : ${notFound}  (not in Supabase auth)`);
  console.log(`Failed   : ${failed}`);
  console.log("──────────────────────────────");
}

main().catch(console.error);
