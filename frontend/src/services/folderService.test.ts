import { beforeEach, describe, expect, it, vi } from "vitest"

import { folderService } from "@/services/folderService"
import api from "@/services/api"

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

describe("folderService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads folders and normalizes date fields", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [{ id: 1, name: "Dinner", description: "Meals", created_at: "2026-03-29" }],
    })

    await expect(folderService.getFolders()).resolves.toEqual([
      {
        id: "1",
        name: "Dinner",
        description: "Meals",
        createdAt: "2026-03-29",
      },
    ])
    expect(api.get).toHaveBeenCalledWith("/folders")
  })

  it("normalizes nested createFolder responses", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        message: "Folder created",
        folder: { id: 2, name: "Dessert", description: null },
      },
    })

    await expect(folderService.createFolder("Dessert")).resolves.toEqual({
      id: "2",
      name: "Dessert",
      description: null,
      createdAt: undefined,
    })
    expect(api.post).toHaveBeenCalledWith("/folders", { name: "Dessert" })
  })

  it("deletes folders", async () => {
    vi.mocked(api.delete).mockResolvedValue({})

    await expect(folderService.deleteFolder("2")).resolves.toBeUndefined()
    expect(api.delete).toHaveBeenCalledWith("/folders/2")
  })

  it("normalizes folder bookmarks and recipe details", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        {
          bookmark_id: 11,
          user_rating: 4,
          saved_at: "2026-03-29",
          recipe: {
            id: 101,
            Name: "Spicy Pasta",
            Images: 'c("https://images.example.com/pasta.jpg")',
            Calories: 420,
          },
        },
      ],
    })

    await expect(folderService.getFolderBookmarks("2")).resolves.toEqual([
      {
        bookmarkId: "11",
        userRating: 4,
        savedAt: "2026-03-29",
        recipe: {
          id: "101",
          Name: "Spicy Pasta",
          Images: 'c("https://images.example.com/pasta.jpg")',
          Description: "",
          AggregatedRating: 0,
          RecipeCategory: "",
          CookTimeMins: 0,
          PrepTimeMins: 0,
          TotalTimeMins: 0,
          Calories: 420,
          ProteinContent: 0,
          FatContent: 0,
          CarbohydrateContent: 0,
          FiberContent: 0,
          RecipeIngredientParts: "",
          RecipeInstructions: "",
          Keywords: "",
        },
      },
    ])
    expect(api.get).toHaveBeenCalledWith("/folders/2/bookmarks")
  })

  it("normalizes folder recommendations into recipe previews", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        title: "Inspired by Dinner",
        data: [
          {
            RecipeId: 101,
            Name: "Spicy Pasta",
            Images: ["https://images.example.com/pasta.jpg"],
            RecipeCategory: "Dinner",
            AggregatedRating: 4.5,
            Calories: 420,
            TotalTimeMins: 25,
          },
        ],
      },
    })

    await expect(folderService.getFolderRecommendations("2")).resolves.toEqual({
      title: "Inspired by Dinner",
      data: [
        {
          id: "101",
          name: "Spicy Pasta",
          image: "https://images.example.com/pasta.jpg",
          category: "Dinner",
          rating: 4.5,
          calories: 420,
          total_time: 25,
        },
      ],
    })
  })
})
