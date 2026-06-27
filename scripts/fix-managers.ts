/**
 * Demotes incorrectly-assigned managers to employee role.
 * Keeps only the 17 true managers from mockManagers.ts + test user + Mamdouh.
 *
 * Usage:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *   npx tsx scripts/fix-managers.ts
 */

import { createClient } from "@supabase/supabase-js";
import { rolePermissions } from "../src/app/data/rolePermissions";

type ManagerRow = {
  id: string;
  username: string | null;
  financial_number: string | null;
  name: string | null;
};

const SUPABASE_URL = "https://dbximhtxzeqiqisfadaq.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// True department managers (financial numbers from mockManagers.ts)
const TRUE_MANAGER_FINS = new Set([
  "816",
  "932",
  "933",
  "957",
  "983",
  "991",
  "995",
  "1011",
  "1040",
  "1051",
  "1090",
  "1137",
  "1230",
  "1244",
  "1337",
  "1432",
  "MANUAL-FIN-001", // ممدوح محمد شاكر
  "0005", // test manager user
]);

async function main() {
  // Fetch all profiles with role = manager
  const { data: managers, error } = await supabase
    .from("profiles")
    .select("id, username, financial_number, name")
    .eq("role", "manager");

  if (error || !managers) {
    console.error("Failed to fetch managers:", error?.message);
    process.exit(1);
  }

  const typedManagers = managers as ManagerRow[];

  console.log(`Found ${typedManagers.length} profiles with role=manager`);

  const toKeep = typedManagers.filter(
    (m) =>
      TRUE_MANAGER_FINS.has(m.financial_number ?? "") ||
      TRUE_MANAGER_FINS.has(m.username ?? "")
  );

  const toDemote = typedManagers.filter(
    (m) =>
      !TRUE_MANAGER_FINS.has(m.financial_number ?? "") &&
      !TRUE_MANAGER_FINS.has(m.username ?? "")
  );

  console.log(`  ✓ Keeping as manager : ${toKeep.length}`);
  console.log(`  ↓ Demoting to employee: ${toDemote.length}\n`);

  if (toDemote.length === 0) {
    console.log("Nothing to demote.");
    return;
  }

  // Demote in batch by IDs
  const ids = toDemote.map((m) => m.id);
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      role: "employee",
      permissions: rolePermissions.employee,
    })
    .in("id", ids);

  if (updateError) {
    console.error("Update failed:", updateError.message);
    process.exit(1);
  }

  console.log("Demoted users:");
  toDemote.forEach((m) =>
    console.log(
      `  ${(m.financial_number || m.username || "").padStart(6)} | ${m.name ?? ""}`
    )
  );

  console.log(`\n✓ Done — ${toDemote.length} users changed to employee role.`);
  console.log(`✓ ${toKeep.length} true managers unchanged.`);
}

main().catch(console.error);
