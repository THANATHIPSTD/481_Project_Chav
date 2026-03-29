import type { SyntheticEvent } from "react"

export const RECIPE_IMAGE_FALLBACK_URL =
  "https://previews.123rf.com/images/hugnoi/hugnoi1809/hugnoi180900045/109912619-top-view-of-empty-white-food-dish-on-a-wooden-background.jpg"

const LAST_RESORT_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
    <defs>
      <linearGradient id="wood" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#d9b28a" />
        <stop offset="100%" stop-color="#b8835f" />
      </linearGradient>
      <radialGradient id="plate" cx="50%" cy="45%" r="40%">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#ececec" />
      </radialGradient>
    </defs>
    <rect width="1200" height="900" fill="url(#wood)" />
    <circle cx="600" cy="450" r="255" fill="url(#plate)" />
    <circle cx="600" cy="450" r="182" fill="#fafafa" />
  </svg>
`

const LAST_RESORT_RECIPE_IMAGE_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  LAST_RESORT_SVG,
)}`

export const handleRecipeImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget

  delete image.dataset.fallbackLevel
  image.classList.remove("hidden")
  image.classList.remove("opacity-0")
  image.classList.add("opacity-100")
}

export const handleRecipeImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget
  const fallbackLevel = image.dataset.fallbackLevel ?? "none"
  const currentSource = image.currentSrc || image.src

  if (fallbackLevel === "none" && currentSource !== RECIPE_IMAGE_FALLBACK_URL) {
    image.dataset.fallbackLevel = "external"
    image.src = RECIPE_IMAGE_FALLBACK_URL
    return
  }

  if (fallbackLevel !== "inline") {
    image.dataset.fallbackLevel = "inline"
    image.src = LAST_RESORT_RECIPE_IMAGE_URL
    return
  }

  image.classList.add("hidden")
}
