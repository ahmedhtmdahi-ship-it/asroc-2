import { createClient } from "@supabase/supabase-js";
import { medicinesSeed } from "../src/app/data/medicinesSeed";

const SUPABASE_URL = "https://dbximhtxzeqiqisfadaq.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BATCH_SIZE = 500;

async function main() {
  console.log(`Found ${medicinesSeed.length} medicines. Starting migration...\n`);

  const rows = medicinesSeed.map((m) => ({
    id: m.id,
    name: m.name,
    unit: m.unit,
    current_stock: m.currentStock ?? null,
    minimum_stock: m.minimumStock ?? null,
    category: m.category ?? "",
    active_ingredient: m.activeIngredient ?? "",
    is_active: m.isActive ?? true,
  }));

  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const { error } = await supabase.from("medicines").upsert(batch, { onConflict: "id" });

    if (error) {
      console.error(`  x Batch ${i}-${i + BATCH_SIZE}: ${error.message}`);
    } else {
      inserted += batch.length;
      console.log(`  ${inserted} / ${rows.length} done...`);
    }
  }

  console.log("\n──────────────────────────────");
  console.log(`Inserted : ${inserted}`);
  console.log(`Total    : ${rows.length}`);
  console.log("──────────────────────────────");
}

main().catch(console.error);
