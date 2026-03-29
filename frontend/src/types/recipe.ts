export interface RecipeDetail {
  id: string
  Name: string
  Images: string | string[]
  Description: string
  AggregatedRating: number
  RecipeCategory: string
  CookTimeMins: number
  PrepTimeMins: number
  TotalTimeMins: number
  Calories: number
  ProteinContent: number
  FatContent: number
  CarbohydrateContent: number
  FiberContent: number
  RecipeIngredientParts: string
  RecipeInstructions: string
  Keywords: string
}

export interface RecipePreview {
  id: string
  name: string
  image: string | null
  category: string | null
  rating: number
  calories: number
  total_time: number
}

export interface RecipeSearchResponse {
  results: RecipePreview[]
  totalFound: number
  didYouMean: string | null
  page: number
  limit: number
}

export interface AutocompleteOption {
  id: string
  name: string
}
