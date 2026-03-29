import { beforeEach, describe, expect, it, vi } from "vitest"

import api from "@/services/api"
import { feedService } from "@/services/feedService"

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
  },
}))

describe("feedService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("normalizes for-you feeds", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        title: "recommend for you",
        page: 1,
        limit: 20,
        total_found: 1,
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

    await expect(feedService.getForYouFeed(1, 20)).resolves.toEqual({
      title: "recommend for you",
      page: 1,
      limit: 20,
      totalFound: 1,
      category: undefined,
      keywordUsed: undefined,
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

  it("passes category and keyword params through specialized feed methods", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        data: { page: 2, limit: 20, total_found: 0, category: "Dessert", data: [] },
      })
      .mockResolvedValueOnce({
        data: { page: 3, limit: 20, total_found: 0, keyword_used: "spicy", data: [] },
      })

    await feedService.getCategoryFeed(2, 20, "Dessert")
    await feedService.getDiscoverFeed(3, 20, "spicy")

    expect(api.get).toHaveBeenNthCalledWith(1, "/feed/category", {
      params: {
        page: 2,
        limit: 20,
        category: "Dessert",
      },
    })
    expect(api.get).toHaveBeenNthCalledWith(2, "/feed/discover", {
      params: {
        page: 3,
        limit: 20,
        keyword: "spicy",
      },
    })
  })
})
