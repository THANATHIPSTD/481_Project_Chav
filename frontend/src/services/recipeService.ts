import api from "@/services/api"
import type { AutocompleteOption, RecipeDetail, RecipePreview, RecipeSearchResponse } from "@/types/recipe"

interface RawRecipePreview {
  id?: string | number
  RecipeId?: string | number
  name?: string
  Name?: string
  image?: string | null
  Images?: string | string[] | null
  category?: string | null
  RecipeCategory?: string | null
  rating?: number
  AggregatedRating?: number
  calories?: number
  Calories?: number
  total_time?: number
  TotalTimeMins?: number
}

interface RawSearchResponse {
  results?: RawRecipePreview[]
  total_found?: number
  did_you_mean?: string | null
  page?: number
  limit?: number
}

type RawRecipeDetail = Omit<Partial<RecipeDetail>, "id"> & { id?: string | number }

function extractPrimaryImage(image: string | string[] | null | undefined) {
  if (!image || image === "n/a" || image === "nan") return null

  if (Array.isArray(image)) {
    return image.find((item) => item && item !== "n/a" && item !== "nan") ?? null
  }

  const cleaned = image.replace(/c\("/g, "").replace(/"\)/g, "")
  const imageCandidates = cleaned
    .split(", ")
    .map((item) => item.trim().replace(/['"]/g, ""))
    .filter((item) => item.startsWith("http"))

  return imageCandidates[0] ?? image
}

export function normalizeRecipePreview(recipe: RawRecipePreview): RecipePreview {
  return {
    id: String(recipe.id ?? recipe.RecipeId ?? ""),
    name: recipe.name ?? recipe.Name ?? "Untitled recipe",
    image: extractPrimaryImage(recipe.image ?? recipe.Images),
    category: recipe.category ?? recipe.RecipeCategory ?? null,
    rating: Number(recipe.rating ?? recipe.AggregatedRating ?? 0),
    calories: Number(recipe.calories ?? recipe.Calories ?? 0),
    total_time: Number(recipe.total_time ?? recipe.TotalTimeMins ?? 0),
  }
}

export function normalizeRecipeDetail(recipe: RawRecipeDetail): RecipeDetail {
  return {
    id: String(recipe.id ?? ""),
    Name: recipe.Name ?? "",
    Images: recipe.Images ?? [],
    Description: recipe.Description ?? "",
    AggregatedRating: Number(recipe.AggregatedRating ?? 0),
    RecipeCategory: recipe.RecipeCategory ?? "",
    CookTimeMins: Number(recipe.CookTimeMins ?? 0),
    PrepTimeMins: Number(recipe.PrepTimeMins ?? 0),
    TotalTimeMins: Number(recipe.TotalTimeMins ?? 0),
    Calories: Number(recipe.Calories ?? 0),
    ProteinContent: Number(recipe.ProteinContent ?? 0),
    FatContent: Number(recipe.FatContent ?? 0),
    CarbohydrateContent: Number(recipe.CarbohydrateContent ?? 0),
    FiberContent: Number(recipe.FiberContent ?? 0),
    RecipeIngredientParts: recipe.RecipeIngredientParts ?? "",
    RecipeInstructions: recipe.RecipeInstructions ?? "",
    Keywords: recipe.Keywords ?? "",
  }
}

async function getRecipeDetail(recipeId: string) {
  const response = await api.get(`/search/${recipeId}`)
  return normalizeRecipeDetail(response.data)
}

async function searchRecipes(query: string, page = 1, limit = 15, category?: string | null): Promise<RecipeSearchResponse> {
  const response = await api.get<RawSearchResponse>("/search", {
    params: {
      q: query,
      page,
      limit,
      ...(category ? { category } : {}),
    },
  })

  return {
    page: Number(response.data.page ?? page),
    limit: Number(response.data.limit ?? limit),
    totalFound: Number(response.data.total_found ?? 0),
    didYouMean: response.data.did_you_mean ?? null,
    results: (response.data.results ?? []).map(normalizeRecipePreview),
  }
}

async function getAutocompleteSuggestions(query: string): Promise<AutocompleteOption[]> {
  const response = await api.get<AutocompleteOption[]>("/search/autocomplete", {
    params: { q: query },
  })
  return response.data
}

export const recipeService = {
  getRecipeDetail,
  searchRecipes,
  getAutocompleteSuggestions,
}
