import { memo } from "react"
import { Clock, Flame, ImageOff, Star } from "lucide-react"

import { handleRecipeImageError, handleRecipeImageLoad } from "@/lib/imageFallback"
import { getHomeCardImageAttributes } from "@/lib/imageProxy"

export interface HomeFeedCardRecipe {
  id: string
  name: string
  image: string | null
  category: string | null
  rating: number
  calories: number
  total_time: number
}

interface HomeFeedCardProps {
  recipe: HomeFeedCardRecipe
  eager: boolean
  onOpenRecipe: (id: string) => void
}

function HomeFeedCardComponent({ recipe, eager, onOpenRecipe }: HomeFeedCardProps) {
  const imageUrl = recipe.image
  const optimizedImage = imageUrl ? getHomeCardImageAttributes(imageUrl) : null

  return (
    <button
      type="button"
      className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white p-2 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
      onClick={() => onOpenRecipe(recipe.id)}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-zinc-100">
        {imageUrl ? (
          <img
            src={optimizedImage?.src}
            srcSet={optimizedImage?.srcSet}
            sizes={optimizedImage?.sizes}
            alt={recipe.name}
            className="h-full w-full object-cover opacity-0 transition-all duration-500 group-hover:scale-[1.03]"
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={eager ? "high" : "low"}
            onLoad={handleRecipeImageLoad}
            onError={handleRecipeImageError}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-100">
            <ImageOff className="h-8 w-8 text-zinc-300" />
          </div>
        )}

        <div className="absolute left-3 top-3 flex w-[calc(100%-24px)] gap-2 justify-between">
          {recipe.category && recipe.category !== "n/a" ? (
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-800 shadow-sm backdrop-blur-md">
              {recipe.category}
            </span>
          ) : (
            <span />
          )}

          {recipe.rating > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-yellow-400/90 px-2 py-1 text-xs font-bold text-yellow-900 shadow-sm backdrop-blur-md">
              <Star className="h-3 w-3 fill-yellow-900" />
              {recipe.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-lg font-bold leading-tight tracking-tight text-zinc-900 transition-colors group-hover:text-blue-600">
          {recipe.name}
        </h3>
        <div className="mt-auto flex items-center justify-between pt-4 text-zinc-500">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium">
            <Clock className="h-4 w-4" />
            {recipe.total_time ? `${recipe.total_time} min` : "N/A"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium">
            <Flame className="h-4 w-4 text-orange-500" />
            {recipe.calories ? `${Math.round(recipe.calories)} cal` : "N/A"}
          </span>
        </div>
      </div>
    </button>
  )
}

export const HomeFeedCard = memo(
  HomeFeedCardComponent,
  (prevProps, nextProps) =>
    prevProps.eager === nextProps.eager &&
    prevProps.recipe.id === nextProps.recipe.id &&
    prevProps.recipe.name === nextProps.recipe.name &&
    prevProps.recipe.image === nextProps.recipe.image &&
    prevProps.recipe.category === nextProps.recipe.category &&
    prevProps.recipe.rating === nextProps.recipe.rating &&
    prevProps.recipe.calories === nextProps.recipe.calories &&
    prevProps.recipe.total_time === nextProps.recipe.total_time,
)
