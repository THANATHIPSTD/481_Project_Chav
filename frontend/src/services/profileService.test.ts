import { beforeEach, describe, expect, it, vi } from "vitest"

import api from "@/services/api"
import { profileService } from "@/services/profileService"

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}))

describe("profileService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads and normalizes the current profile", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        id: 7,
        username: "chefthanathip",
        first_name: "Chef",
        last_name: "Thanathip",
        preferences: "spicy,healthy",
        created_at: "2026-03-29",
      },
    })

    await expect(profileService.getProfile()).resolves.toEqual({
      id: "7",
      username: "chefthanathip",
      firstName: "Chef",
      lastName: "Thanathip",
      preferences: "spicy,healthy",
      createdAt: "2026-03-29",
    })
    expect(api.get).toHaveBeenCalledWith("/auth/me")
  })

  it("updates profile data with normalized payloads", async () => {
    vi.mocked(api.put).mockResolvedValue({
      data: {
        message: "Profile updated successfully!",
        first_name: "Chef",
        last_name: "Thanathip",
      },
    })

    await expect(profileService.updateProfile({ firstName: "Chef", lastName: "Thanathip" })).resolves.toEqual({
      message: "Profile updated successfully!",
      firstName: "Chef",
      lastName: "Thanathip",
    })
    expect(api.put).toHaveBeenCalledWith("/auth/update-profile", {
      first_name: "Chef",
      last_name: "Thanathip",
    })
  })
})
