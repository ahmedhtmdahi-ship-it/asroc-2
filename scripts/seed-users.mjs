/**
 * One-time migration script: imports all mockUsers into Supabase Auth + profiles table.
 *
 * Requirements:
 *   - Run the SQL migrations in Supabase SQL Editor first (create tables/enums).
 *   - Get your service_role key from: Supabase Dashboard → Settings → API → service_role
 *
 * Usage (PowerShell):
 *   $env:SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
 *   node --experimental-vm-modules scripts/seed-users.mjs
 *
 * Or in one line:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="sk_..."; node scripts/seed-users.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://dbximhtxzeqiqisfadaq.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error("❌  Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  console.error('   Set it first: $env:SUPABASE_SERVICE_ROLE_KEY="sk_..."');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Load mockUsers from the TypeScript file (strip TS syntax) ────────────────
function loadMockUsers() {
  const filePath = path.resolve(__dirname, "../src/app/data/mockUsers.ts");
  let src = readFileSync(filePath, "utf8");

  // Strip TypeScript: import statements, type annotations, `as Type` casts
  src = src
    .replace(/^import\s+.*?;$/gm, "")
    .replace(/^export\s+const\s+mockUsers:\s*User\[\]\s*=/, "const mockUsers =")
    .replace(/:\s*UserRole/g, "")
    .replace(/:\s*Permission\[\]/g, "")
    .replace(/:\s*string/g, "")
    .replace(/:\s*boolean/g, "");

  src += "\nmodule.exports = { mockUsers };";

  // Use a temp require-style eval via Function
  const fn = new Function("module", "exports", "require", src);
  const mod = { exports: {} };
  fn(mod, mod.exports, createRequire(import.meta.url));
  return mod.exports.mockUsers;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Loading mock users...");
  const mockUsers = loadMockUsers();
  console.log(`Found ${mockUsers.length} users. Starting migration...\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of mockUsers) {
    const email = `${String(user.username).trim().toLowerCase()}@asroc.local`;

    // 1. Create auth user
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password: String(user.password),
        email_confirm: true,
      });

    if (authError) {
      if (
        authError.message.includes("already been registered") ||
        authError.message.includes("already exists")
      ) {
        skipped++;
        continue;
      }
      console.error(`  ✗ Auth failed [${user.username}]: ${authError.message}`);
      failed++;
      continue;
    }

    // 2. Insert profile row
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
      console.error(
        `  ✗ Profile failed [${user.username}]: ${profileError.message}`
      );
      failed++;
    } else {
      created++;
      if (created % 100 === 0) {
        console.log(`  ✓ ${created} users migrated so far...`);
      }
    }
  }

  console.log("\n─────────────────────────────────");
  console.log(`✓ Created : ${created}`);
  console.log(`↷ Skipped : ${skipped}  (already existed)`);
  console.log(`✗ Failed  : ${failed}`);
  console.log("─────────────────────────────────");

  if (failed > 0) {
    console.log("\nCheck errors above and re-run — skipped users are safe to re-run.");
  } else {
    console.log("\n🎉 Migration complete! All users are in Supabase.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
