import { beforeEach, describe, expect, it, vi } from "vitest"

import { preferencesService } from "@/services/preferencesService"
import api from "@/services/api"

vi.mock("@/services/api", () => ({
  default: {
    post: vi.fn(),
  },
}))

describe("preferencesService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("sends preference payloads to the update-preferences endpoint", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { message: "saved" },
    })

    await preferencesService.savePreferences({ preferences: ["spicy", "healthy"] })

    expect(api.post).toHaveBeenCalledWith("/auth/update-preferences", {
      preferences: ["spicy", "healthy"],
    })
  })
})
