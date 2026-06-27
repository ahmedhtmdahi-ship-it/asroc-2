import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges multiple class strings into one", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("keeps only the last conflicting Tailwind class (tailwind-merge)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("drops falsy values (conditional classes)", () => {
    expect(cn("base", false, null, undefined, "")).toBe("base");
  });

  it("applies a class only when its condition is truthy", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("btn", isActive && "btn-active", isDisabled && "btn-disabled")).toBe(
      "btn btn-active"
    );
  });

  it("flattens arrays and objects (clsx behaviour)", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });

  it("returns an empty string when given no meaningful input", () => {
    expect(cn()).toBe("");
    expect(cn(false, null, undefined)).toBe("");
  });
});
