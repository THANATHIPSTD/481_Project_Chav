import type { SyntheticEvent } from "react"

export const RECIPE_IMAGE_FALLBACK_URL =
  "https://static.vecteezy.com/system/resources/previews/010/721/365/large_2x/top-view-of-empty-and-dirty-dish-after-eating-free-photo.jpg"

export const handleRecipeImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget

  delete image.dataset.isFallback
  image.classList.remove("hidden")
  image.classList.remove("opacity-0")
  image.classList.add("opacity-100")
}

export const handleRecipeImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget
  
  // If we already tried the fallback and it also failed, just hide the image
  if (image.dataset.isFallback === "true") {
    image.classList.add("hidden")
    return
  }

  // Set the fallback image and mark it
  image.dataset.isFallback = "true"
  image.src = RECIPE_IMAGE_FALLBACK_URL
  image.classList.remove("opacity-0")
  image.classList.add("opacity-100")
}
