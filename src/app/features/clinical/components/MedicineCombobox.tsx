import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/app/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import { cn } from "@/app/components/ui/utils";
import { medicineStore } from "@/app/store/medicineStore";
import { useStore } from "@/app/store/reactiveStore";

// سقف الصفوف المرسومة في القائمة. كتالوج الأدوية ~19 ألف صنف؛ رسمهم كلهم في
// <Select> كان بيولّد 19 ألف عنصر DOM ويعلّق الصفحة. هنا بنفلتر في الذاكرة
// وبنرسم أول MAX_RESULTS بس — الطبيب بيكتب حرفين فتتضيّق القائمة فورًا.
const MAX_RESULTS = 50;

/**
 * منتقي دواء قابل للبحث (Popover + Command). مكتفٍ بذاته: يشترك في كتالوج
 * الأدوية ويحمّله كسول أول ما يظهر، فأي صفحة تستخدمه ما بتحمّلش الكتالوج عالميًا.
 */
export function MedicineCombobox({
  value,
  onSelect,
  placeholder = "اختر الدواء",
}: {
  value: string;
  onSelect: (medicine: { id: string; name: string }) => void;
  placeholder?: string;
}) {
  const medicines = useStore(medicineStore, (s) => s.getAll());
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void medicineStore.ensureLoaded();
  }, []);

  const selected = medicines.find((m) => m.id === value);

  // فلترة في الذاكرة مع سقف — cmdk فلترته مقفولة (shouldFilter=false) وبنتحكم إحنا.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = medicines.filter((m) => m.isActive);
    const matched = q
      ? active.filter((m) => m.name.toLowerCase().includes(q))
      : active;
    return { items: matched.slice(0, MAX_RESULTS), total: matched.length };
  }, [medicines, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !selected && "text-slate-400")}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="ابحث باسم الدواء..."
          />
          <CommandList>
            <CommandEmpty>لا توجد أدوية مطابقة</CommandEmpty>
            <CommandGroup>
              {results.items.map((m) => (
                <CommandItem
                  key={m.id}
                  value={m.id}
                  onSelect={() => {
                    onSelect({ id: m.id, name: m.name });
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4",
                      value === m.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{m.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {results.total > MAX_RESULTS && (
              <p className="px-3 py-2 text-center text-xs text-slate-500">
                يظهر أول {MAX_RESULTS} من {results.total} — اكتب لتضييق البحث
              </p>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
