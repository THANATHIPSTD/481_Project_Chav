import { beforeEach, describe, expect, it, vi } from "vitest"

import api from "@/services/api"
import { normalizeRecipeDetail, normalizeRecipePreview, recipeService } from "@/services/recipeService"

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
  },
}))

describe("recipeService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("normalizes recipe previews from raw API fields", () => {
    expect(
      normalizeRecipePreview({
        RecipeId: 101,
        Name: "Spicy Pasta",
        Images: 'c("https://images.example.com/pasta.jpg", "https://images.example.com/extra.jpg")',
        RecipeCategory: "Dinner",
        AggregatedRating: 4.5,
        Calories: 420,
        TotalTimeMins: 25,
      }),
    ).toEqual({
      id: "101",
      name: "Spicy Pasta",
      image: "https://images.example.com/pasta.jpg",
      category: "Dinner",
      rating: 4.5,
      calories: 420,
      total_time: 25,
    })
  })

  it("normalizes recipe detail payloads", () => {
    expect(
      normalizeRecipeDetail({
        id: 101,
        Name: "Spicy Pasta",
        Calories: 420,
      }),
    ).toEqual({
      id: "101",
      Name: "Spicy Pasta",
      Images: [],
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
    })
  })

  it("searches recipes and normalizes the response shape", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        page: 2,
        limit: 15,
        total_found: 1,
        did_you_mean: "garlic pasta",
        results: [
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

    await expect(recipeService.searchRecipes("spciy pasta", 2, 15)).resolves.toEqual({
      page: 2,
      limit: 15,
      totalFound: 1,
      didYouMean: "garlic pasta",
      results: [
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
    expect(api.get).toHaveBeenCalledWith("/search", {
      params: {
        q: "spciy pasta",
        page: 2,
        limit: 15,
      },
    })
  })

  it("fetches autocomplete suggestions and recipe details", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: [{ id: "1", name: "Pasta" }],
      })
      .mockResolvedValueOnce({
        data: { id: 101, Name: "Spicy Pasta" },
      })

    await expect(recipeService.getAutocompleteSuggestions("pa")).resolves.toEqual([{ id: "1", name: "Pasta" }])
    await expect(recipeService.getRecipeDetail("101")).resolves.toMatchObject({
      id: "101",
      Name: "Spicy Pasta",
    })
  })
})
