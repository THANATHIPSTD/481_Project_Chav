import { memo } from "react"

import { HomeFeedCard, type HomeFeedCardRecipe } from "@/components/HomeFeedCard"

interface HomeFeedGridProps {
  recipes: HomeFeedCardRecipe[]
  currentPage: number
  isStale: boolean
  onOpenRecipe: (id: string) => void
}

function HomeFeedGridComponent({ recipes, currentPage, isStale, onOpenRecipe }: HomeFeedGridProps) {
  return (
    <div
      className={`grid gap-6 transition-opacity duration-150 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 ${
        isStale ? "opacity-80" : "opacity-100"
      }`}
    >
      {recipes.map((recipe, index) => (
        <HomeFeedCard
          key={recipe.id}
          recipe={recipe}
          eager={index < 4 && currentPage === 1}
          onOpenRecipe={onOpenRecipe}
        />
      ))}
    </div>
  )
}

export const HomeFeedGrid = memo(
  HomeFeedGridComponent,
  (prevProps, nextProps) =>
    prevProps.recipes === nextProps.recipes &&
    prevProps.currentPage === nextProps.currentPage &&
    prevProps.isStale === nextProps.isStale,
)
