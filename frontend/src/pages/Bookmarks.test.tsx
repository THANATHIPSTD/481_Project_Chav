import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Bookmarks from "./Bookmarks"
import { bookmarkService } from "@/services/bookmarkService"
import { folderService } from "@/services/folderService"
import { recipeService } from "@/services/recipeService"

// Mock framer-motion to avoid issues with animations in Vitest
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock lazy-loaded RecipeModal and other components as needed
vi.mock("@/components/RecipeModal", () => ({
  RecipeModal: ({ isOpen, onClose, recipe }: any) =>
    isOpen ? (
      <div data-testid="recipe-modal">
        <button onClick={onClose}>Close Modal</button>
        <div data-testid="modal-recipe-name">{recipe?.Name}</div>
      </div>
    ) : null,
}))

// Mock services
vi.mock("@/services/folderService", () => ({
  folderService: {
    getFolders: vi.fn(),
    getFolderBookmarks: vi.fn(),
    getFolderRecommendations: vi.fn(),
    createFolder: vi.fn(),
    deleteFolder: vi.fn(),
  },
}))

vi.mock("@/services/bookmarkService", () => ({
  bookmarkService: {
    removeBookmark: vi.fn(),
  },
}))

vi.mock("@/services/recipeService", () => ({
  recipeService: {
    getRecipeDetail: vi.fn(),
  },
}))

describe("Bookmarks Page", () => {
  const mockFolders = [
    { id: "1", name: "Favorites" },
    { id: "2", name: "Quick Dinner" },
  ]

  const mockBookmarks = [
    {
      bookmarkId: "b1",
      userRating: 5,
      recipe: {
        id: "r1",
        Name: "Spicy Pasta",
        RecipeCategory: "Dinner",
        RecipeIngredientParts: 'c("pasta", "sauce")',
        Images: 'c("https://example.com/pasta.jpg")',
      },
    },
  ]

  const mockRecommendations = {
    title: "Based on Spicy Pasta",
    data: [
      {
        id: "r2",
        name: "Creamy Pasta",
        category: "Dinner",
        rating: 4.8,
        total_time: 20,
        calories: 500,
        image: "https://example.com/creamy.jpg",
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(folderService.getFolders).mockResolvedValue(mockFolders)
    vi.mocked(folderService.getFolderBookmarks).mockResolvedValue(mockBookmarks)
    vi.mocked(folderService.getFolderRecommendations).mockResolvedValue(mockRecommendations)
  })

  it("renders folders and the first folder's bookmarks on mount", async () => {
    render(<Bookmarks />)

    // Wait for folders in sidebar
    await waitFor(() => {
      const sidebar = screen.getByRole("heading", { name: /My Bookmarks/i }).parentElement
      expect(within(sidebar!).getByText("Favorites")).toBeInTheDocument()
      expect(within(sidebar!).getByText("Quick Dinner")).toBeInTheDocument()
    })

    // Wait for bookmarks in main content
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Favorites", level: 1 })).toBeInTheDocument()
      expect(screen.getByText("Spicy Pasta")).toBeInTheDocument()
      expect(screen.getByText("Based on Spicy Pasta")).toBeInTheDocument()
    })
  })

  it("changes selected folder and fetches new data", async () => {
    const newBookmarks = [
      {
        bookmarkId: "b2",
        userRating: 4,
        recipe: { Name: "Quick Salad" },
      },
    ]
    vi.mocked(folderService.getFolderBookmarks).mockResolvedValueOnce(mockBookmarks)
    vi.mocked(folderService.getFolderBookmarks).mockResolvedValueOnce(newBookmarks)

    render(<Bookmarks />)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Favorites", level: 1 })).toBeInTheDocument()
    })

    // Click on Quick Dinner folder in sidebar
    const sidebar = screen.getByRole("heading", { name: /My Bookmarks/i }).parentElement!
    fireEvent.click(within(sidebar).getByText("Quick Dinner"))

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Quick Dinner", level: 1 })).toBeInTheDocument()
      expect(screen.getByText("Quick Salad")).toBeInTheDocument()
    })
  })

  it("can create a new folder", async () => {
    const newFolder = { id: "3", name: "Healthy" }
    vi.mocked(folderService.createFolder).mockResolvedValue(newFolder)

    render(<Bookmarks />)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /New Folder/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /New Folder/i }))

    const input = screen.getByPlaceholderText("Folder name")
    fireEvent.change(input, { target: { value: "Healthy" } })
    fireEvent.click(screen.getByRole("button", { name: /Add/i }))

    await waitFor(() => {
      expect(folderService.createFolder).toHaveBeenCalledWith("Healthy")
      // Check sidebar for the new folder
      const sidebar = screen.getByRole("heading", { name: /My Bookmarks/i }).parentElement!
      expect(within(sidebar).getByText("Healthy")).toBeInTheDocument()
    })
  })

  it("shows confirmation modal and deletes a folder", async () => {
    vi.mocked(folderService.deleteFolder).mockResolvedValue({})

    render(<Bookmarks />)

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Favorites", level: 1 })).toBeInTheDocument()
    })

    // Click delete icon for Favorites in sidebar
    const sidebar = screen.getByRole("heading", { name: /My Bookmarks/i }).parentElement!
    const favoritesRow = within(sidebar).getByText("Favorites").closest(".group")!
    const trashBtn = within(favoritesRow).getByRole("button")
    
    fireEvent.click(trashBtn)

    expect(screen.getByText("Delete Folder?")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Delete Folder" }))

    await waitFor(() => {
      expect(folderService.deleteFolder).toHaveBeenCalledWith("1")
      expect(within(sidebar).queryByText("Favorites")).not.toBeInTheDocument()
    })
  })

  it("removes a bookmark from a folder", async () => {
    vi.mocked(bookmarkService.removeBookmark).mockResolvedValue({})

    render(<Bookmarks />)

    await waitFor(() => {
      expect(screen.getByText("Spicy Pasta")).toBeInTheDocument()
    })

    const removeBtn = screen.getByTitle("Remove bookmark")
    fireEvent.click(removeBtn)

    expect(screen.getByText("Remove Bookmark?")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Remove Bookmark" }))

    await waitFor(() => {
      expect(bookmarkService.removeBookmark).toHaveBeenCalledWith("b1")
      expect(screen.queryByText("Spicy Pasta")).not.toBeInTheDocument()
    })
  })

  it("opens recipe detail modal when a bookmark is clicked", async () => {
    render(<Bookmarks />)

    await waitFor(() => {
      expect(screen.getByText("Spicy Pasta")).toBeInTheDocument()
    })

    // Click the recipe card (the heading inside it)
    fireEvent.click(screen.getByRole("heading", { name: "Spicy Pasta" }))

    expect(screen.getByTestId("recipe-modal")).toBeInTheDocument()
    expect(within(screen.getByTestId("recipe-modal")).getByText("Spicy Pasta")).toBeInTheDocument()
  })
})
