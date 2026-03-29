import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Home from "./Home"
import { feedService } from "@/services/feedService"
import { recipeService } from "@/services/recipeService"

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock components
vi.mock("@/components/RecipeModal", () => ({
  RecipeModal: ({ isOpen, recipe }: any) =>
    isOpen ? (
      <div data-testid="recipe-modal">
        {recipe?.Name}
      </div>
    ) : null,
}))

// Mock services
vi.mock("@/services/feedService", () => ({
  feedService: {
    getForYouFeed: vi.fn(),
    getCategoryFeed: vi.fn(),
    getDiscoverFeed: vi.fn(),
    getDiverseFeed: vi.fn(),
  },
}))

vi.mock("@/services/recipeService", () => ({
  recipeService: {
    getRecipeDetail: vi.fn(),
  },
}))

describe("Home Page", () => {
  const mockFeedResponse = {
    data: [
      {
        id: "r1",
        name: "Test Recipe",
        image: "test.jpg",
        category: "Test Cat",
        rating: 4,
        calories: 100,
        total_time: 10,
      },
    ],
    totalFound: 1,
    limit: 20,
    page: 1,
    title: "Test Feed",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(feedService.getForYouFeed).mockResolvedValue(mockFeedResponse)
    vi.mocked(feedService.getCategoryFeed).mockResolvedValue(mockFeedResponse)
    vi.mocked(feedService.getDiscoverFeed).mockResolvedValue(mockFeedResponse)
    vi.mocked(feedService.getDiverseFeed).mockResolvedValue(mockFeedResponse)
  })

  it("renders the for-you feed by default on mount", async () => {
    render(<Home />)

    await waitFor(() => {
      expect(feedService.getForYouFeed).toHaveBeenCalledWith(1, 20)
      expect(screen.getByText("Picked around your taste")).toBeInTheDocument()
      expect(screen.getByText("Test Recipe")).toBeInTheDocument()
    })
  })

  it("switches to escape bubble tab and fetches data", async () => {
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText("Picked around your taste")).toBeInTheDocument()
    })

    const diverseBtn = screen.getByRole("button", { name: /Escape Bubble/i })
    fireEvent.click(diverseBtn)

    await waitFor(() => {
      expect(feedService.getDiverseFeed).toHaveBeenCalled()
      expect(screen.getByText("Tired of the same old recipes?")).toBeInTheDocument()
    })
  })

  it("switches to category randomizer tab and fetches data", async () => {
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText("Picked around your taste")).toBeInTheDocument()
    })

    const categoryBtn = screen.getByRole("button", { name: /Category Randomizer/i })
    fireEvent.click(categoryBtn)

    await waitFor(() => {
      expect(feedService.getCategoryFeed).toHaveBeenCalled()
      expect(screen.getByText("A category worth exploring")).toBeInTheDocument()
    })
  })

  it("switches to discover tab and fetches data", async () => {
    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText("Picked around your taste")).toBeInTheDocument()
    })

    const discoverBtn = screen.getByRole("button", { name: /Discover/i })
    fireEvent.click(discoverBtn)

    await waitFor(() => {
      expect(feedService.getDiscoverFeed).toHaveBeenCalled()
      expect(screen.getByText("Something a little unexpected")).toBeInTheDocument()
    })
  })

  it("opens recipe modal when a recipe is clicked", async () => {
    vi.mocked(recipeService.getRecipeDetail).mockResolvedValue({
      id: "r1",
      Name: "Test Recipe Detail",
    } as any)

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText("Test Recipe")).toBeInTheDocument()
    })

    // Click recipe name
    fireEvent.click(screen.getByText("Test Recipe"))

    await waitFor(() => {
      expect(recipeService.getRecipeDetail).toHaveBeenCalledWith("r1")
      expect(screen.getByTestId("recipe-modal")).toBeInTheDocument()
      expect(screen.getByText("Test Recipe Detail")).toBeInTheDocument()
    })
  })
})
