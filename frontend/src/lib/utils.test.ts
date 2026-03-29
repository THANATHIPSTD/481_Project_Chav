import { describe, expect, it } from "vitest"

import { cn } from "@/lib/utils"

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts", () => {
    expect(cn("px-2", false && "hidden", "px-4", "text-sm")).toBe("px-4 text-sm")
  })

  it("keeps non-conflicting class names", () => {
    expect(cn("rounded-xl", "bg-white", "shadow-sm")).toBe("rounded-xl bg-white shadow-sm")
  })
})
