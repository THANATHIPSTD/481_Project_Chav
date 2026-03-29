import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  handleRecipeImageError: vi.fn(),
  handleRecipeImageLoad: vi.fn(),
  getHomeCardImageAttributes: vi.fn((sourceUrl: string) => ({
    src: `${sourceUrl}?optimized=1`,
    srcSet: `${sourceUrl}?w=320 320w, ${sourceUrl}?w=640 640w`,
    sizes: "100vw",
  })),
}))

vi.mock("@/lib/imageFallback", () => ({
  handleRecipeImageError: mocks.handleRecipeImageError,
  handleRecipeImageLoad: mocks.handleRecipeImageLoad,
}))

vi.mock("@/lib/imageProxy", () => ({
  getHomeCardImageAttributes: mocks.getHomeCardImageAttributes,
}))

import { HomeFeedCard } from "@/components/HomeFeedCard"

describe("HomeFeedCard", () => {
  const recipe = {
    id: "101",
    name: "Spicy Pasta",
    image: "https://images.example.com/pasta.jpg",
    category: "Dinner",
    rating: 4.5,
    calories: 420,
    total_time: 25,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders recipe details and uses optimized image attributes", () => {
    render(<HomeFeedCard recipe={recipe} eager={false} onOpenRecipe={vi.fn()} />)

    expect(screen.getByRole("button", { name: /spicy pasta/i })).toBeInTheDocument()
    expect(screen.getByText("Dinner")).toBeInTheDocument()
    expect(screen.getByText("4.5")).toBeInTheDocument()
    expect(screen.getByText("25 min")).toBeInTheDocument()
    expect(screen.getByText("420 cal")).toBeInTheDocument()

    const image = screen.getByAltText("Spicy Pasta")
    expect(image).toHaveAttribute("src", "https://images.example.com/pasta.jpg?optimized=1")
    expect(image).toHaveAttribute("loading", "lazy")
    expect(mocks.getHomeCardImageAttributes).toHaveBeenCalledWith("https://images.example.com/pasta.jpg")
  })

  it("calls onOpenRecipe when clicked", () => {
    const onOpenRecipe = vi.fn()
    render(<HomeFeedCard recipe={recipe} eager={true} onOpenRecipe={onOpenRecipe} />)

    fireEvent.click(screen.getByRole("button", { name: /spicy pasta/i }))

    expect(onOpenRecipe).toHaveBeenCalledWith("101")
    expect(screen.getByAltText("Spicy Pasta")).toHaveAttribute("loading", "eager")
  })

  it("renders a non-image placeholder when the recipe image is missing", () => {
    render(<HomeFeedCard recipe={{ ...recipe, image: null }} eager={false} onOpenRecipe={vi.fn()} />)

    expect(screen.queryByAltText("Spicy Pasta")).not.toBeInTheDocument()
    expect(mocks.getHomeCardImageAttributes).not.toHaveBeenCalled()
  })
})
