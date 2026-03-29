import { describe, expect, it } from "vitest"

import {
  RECIPE_IMAGE_FALLBACK_URL,
  handleRecipeImageError,
  handleRecipeImageLoad,
} from "@/lib/imageFallback"

function makeImageElement() {
  const image = document.createElement("img")
  image.className = "opacity-0"
  return image
}

describe("imageFallback helpers", () => {
  it("reveals the image on load and clears fallback state", () => {
    const image = makeImageElement()
    image.dataset.isFallback = "true"
    image.classList.add("hidden")

    handleRecipeImageLoad({ currentTarget: image } as React.SyntheticEvent<HTMLImageElement>)

    expect(image.dataset.isFallback).toBeUndefined()
    expect(image).not.toHaveClass("hidden")
    expect(image).not.toHaveClass("opacity-0")
    expect(image).toHaveClass("opacity-100")
  })

  it("switches to the fallback image on the first error", () => {
    const image = makeImageElement()
    image.src = "https://images.example.com/original.jpg"

    handleRecipeImageError({ currentTarget: image } as React.SyntheticEvent<HTMLImageElement>)

    expect(image.dataset.isFallback).toBe("true")
    expect(image.src).toBe(RECIPE_IMAGE_FALLBACK_URL)
    expect(image).toHaveClass("opacity-100")
  })

  it("hides the image after the fallback image also fails to load", () => {
    const image = makeImageElement()
    image.dataset.isFallback = "true"
    image.src = RECIPE_IMAGE_FALLBACK_URL

    handleRecipeImageError({ currentTarget: image } as React.SyntheticEvent<HTMLImageElement>)

    expect(image).toHaveClass("hidden")
  })
})
