import { AxiosError } from "axios"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { authService } from "@/services/AuthService"
import api from "@/services/api"

vi.mock("@/services/api", () => ({
  default: {
    post: vi.fn(),
  },
}))

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("normalizes valid and invalid next paths", () => {
    expect(authService.normalizeNextPath("/bookmarks")).toBe("/bookmarks")
    expect(authService.normalizeNextPath("bookmarks")).toBe("/")
    expect(authService.normalizeNextPath("//evil.com")).toBe("/")
    expect(authService.normalizeNextPath("")).toBe("/")
    expect(authService.normalizeNextPath(null)).toBe("/")
  })

  it("builds a login path with a normalized next param", () => {
    expect(authService.buildLoginPath("/settings")).toBe("/login?next=%2Fsettings")
    expect(authService.buildLoginPath("settings")).toBe("/login?next=%2F")
  })

  it("stores token and username on successful login", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        access_token: "token-123",
        username: "chef",
      },
    })

    await expect(authService.login({ username: "chef", password: "secret" })).resolves.toEqual({
      token: "token-123",
      username: "chef",
    })

    expect(api.post).toHaveBeenCalledWith("/auth/login", { username: "chef", password: "secret" })
    expect(localStorage.getItem("token")).toBe("token-123")
    expect(localStorage.getItem("auth_token")).toBe("token-123")
    expect(localStorage.getItem("username")).toBe("chef")
    expect(authService.isAuthenticated()).toBe(true)
  })

  it("throws when the backend does not return a token", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        username: "chef",
      },
    })

    await expect(authService.login({ username: "chef", password: "secret" })).rejects.toThrow(
      "Token was not returned by the server",
    )
  })

  it("delegates registration to the auth endpoint", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { message: "ok" } })

    await authService.register({
      username: "chef",
      password: "secret",
      first_name: "Pat",
      last_name: "Lee",
    })

    expect(api.post).toHaveBeenCalledWith("/auth/register", {
      username: "chef",
      password: "secret",
      first_name: "Pat",
      last_name: "Lee",
    })
  })

  it("clears stored auth state on logout", () => {
    localStorage.setItem("token", "token-123")
    localStorage.setItem("auth_token", "token-123")
    localStorage.setItem("username", "chef")

    authService.logout()

    expect(localStorage.getItem("token")).toBeNull()
    expect(localStorage.getItem("auth_token")).toBeNull()
    expect(localStorage.getItem("username")).toBeNull()
    expect(authService.isAuthenticated()).toBe(false)
  })

  it("extracts axios and generic error messages safely", () => {
    const axiosError = new AxiosError("request failed")
    axiosError.response = {
      data: { error: "Invalid username or password" },
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: { headers: {} as never },
    }

    expect(authService.extractErrorMessage(axiosError, "fallback")).toBe("Invalid username or password")
    expect(authService.extractErrorMessage(new Error("boom"), "fallback")).toBe("boom")
    expect(authService.extractErrorMessage("unknown", "fallback")).toBe("fallback")
  })
})
