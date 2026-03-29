import api from "@/services/api"
import { normalizeRecipePreview } from "@/services/recipeService"
import type { RecipePreview } from "@/types/recipe"

export type FeedSectionKey = "foryou" | "category" | "discover"

interface RawFeedResponse {
  title?: string
  page?: number
  limit?: number
  total_found?: number
  data?: Array<Record<string, unknown>>
  category?: string
  keyword_used?: string
}

export interface FeedResponse {
  title: string
  page: number
  limit: number
  totalFound: number
  data: RecipePreview[]
  category?: string
  keywordUsed?: string
}

function normalizeFeedResponse(response: RawFeedResponse, fallbackPage: number, fallbackLimit: number): FeedResponse {
  return {
    title: response.title ?? "",
    page: Number(response.page ?? fallbackPage),
    limit: Number(response.limit ?? fallbackLimit),
    totalFound: Number(response.total_found ?? 0),
    data: (response.data ?? []).map((recipe) => normalizeRecipePreview(recipe)),
    category: response.category,
    keywordUsed: response.keyword_used,
  }
}

async function getForYouFeed(page: number, limit: number) {
  const response = await api.get<RawFeedResponse>("/feed/foryou", {
    params: { page, limit },
  })

  return normalizeFeedResponse(response.data, page, limit)
}

async function getCategoryFeed(page: number, limit: number, category?: string) {
  const response = await api.get<RawFeedResponse>("/feed/category", {
    params: {
      page,
      limit,
      ...(category ? { category } : {}),
    },
  })

  return normalizeFeedResponse(response.data, page, limit)
}

async function getDiscoverFeed(page: number, limit: number, keyword?: string) {
  const response = await api.get<RawFeedResponse>("/feed/discover", {
    params: {
      page,
      limit,
      ...(keyword ? { keyword } : {}),
    },
  })

  return normalizeFeedResponse(response.data, page, limit)
}

export const feedService = {
  getForYouFeed,
  getCategoryFeed,
  getDiscoverFeed,
}
