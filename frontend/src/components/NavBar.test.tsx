import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, useLocation } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { NavBar } from "@/components/NavBar"
import { authService } from "@/services/AuthService"

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function LocationDisplay() {
  const location = useLocation()
  return <div data-testid="location-display">{`${location.pathname}${location.search}`}</div>
}

describe("NavBar", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it("sends guests to login before opening bookmarks", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <NavBar />
      </MemoryRouter>,
    )

    const bookmarksLink = screen.getByRole("link", { name: /bookmarks/i })
    expect(bookmarksLink).toHaveAttribute("href", "/login?next=%2Fbookmarks")
    expect(screen.getByRole("link", { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /get started/i })).toBeInTheDocument()
  })

  it("shows the username menu for authenticated users and logs out to /login", async () => {
    const user = userEvent.setup()
    const logoutSpy = vi.spyOn(authService, "logout")
    localStorage.setItem("token", "token-123")
    localStorage.setItem("username", "chefthanathip")

    render(
      <MemoryRouter initialEntries={["/search"]}>
        <NavBar />
        <LocationDisplay />
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("button", { name: /chefthanathip/i }))
    expect(screen.getByText("Account Settings")).toBeInTheDocument()
    expect(screen.getByText("Update Preferences")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /logout/i }))

    expect(logoutSpy).toHaveBeenCalledOnce()
    expect(screen.getByTestId("location-display")).toHaveTextContent("/login")
  })
})
