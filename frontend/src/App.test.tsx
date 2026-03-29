import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import App from "@/App"
import { authService } from "@/services/AuthService"

vi.mock("@/components/NavBar", () => ({
  NavBar: () => <div>NavBar</div>,
}))

vi.mock("@/pages/Home", () => ({
  default: () => <div>Home Page</div>,
}))

vi.mock("@/pages/Discover", () => ({
  default: () => <div>Discover Page</div>,
}))

vi.mock("@/pages/Login", () => ({
  default: () => <div>Login Page</div>,
}))

vi.mock("@/pages/Register", () => ({
  default: () => <div>Register Page</div>,
}))

vi.mock("@/pages/Preferences", () => ({
  default: () => <div>Preferences Page</div>,
}))

vi.mock("@/pages/Settings", () => ({
  default: () => <div>Settings Page</div>,
}))

vi.mock("@/pages/Search", () => ({
  default: () => <div>Search Page</div>,
}))

vi.mock("@/pages/Bookmarks", () => ({
  default: () => <div>Bookmarks Page</div>,
}))

describe("App auth routing", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.history.pushState({}, "", "/")
  })

  it("redirects guests from protected routes to login with next", async () => {
    vi.spyOn(authService, "isAuthenticated").mockReturnValue(false)
    vi.spyOn(authService, "buildLoginPath").mockReturnValue("/login?next=%2Fbookmarks%3Ftab%3Drecent")
    window.history.pushState({}, "", "/bookmarks?tab=recent")

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument()
    })
    expect(window.location.pathname).toBe("/login")
    expect(window.location.search).toBe("?next=%2Fbookmarks%3Ftab%3Drecent")
  })

  it("renders protected pages when authenticated", async () => {
    vi.spyOn(authService, "isAuthenticated").mockReturnValue(true)
    window.history.pushState({}, "", "/bookmarks")

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText("Bookmarks Page")).toBeInTheDocument()
    })
  })
})
