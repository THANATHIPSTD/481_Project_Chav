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
    image.dataset.fallbackLevel = "external"
    image.classList.add("hidden")

    handleRecipeImageLoad({ currentTarget: image } as React.SyntheticEvent<HTMLImageElement>)

    expect(image.dataset.fallbackLevel).toBeUndefined()
    expect(image).not.toHaveClass("hidden")
    expect(image).not.toHaveClass("opacity-0")
    expect(image).toHaveClass("opacity-100")
  })

  it("switches to the external fallback image on the first error", () => {
    const image = makeImageElement()
    image.src = "https://images.example.com/original.jpg"
    Object.defineProperty(image, "currentSrc", {
      configurable: true,
      value: "https://images.example.com/original.jpg",
    })

    handleRecipeImageError({ currentTarget: image } as React.SyntheticEvent<HTMLImageElement>)

    expect(image.dataset.fallbackLevel).toBe("external")
    expect(image.src).toBe(RECIPE_IMAGE_FALLBACK_URL)
  })

  it("switches to the inline svg fallback after the external fallback fails", () => {
    const image = makeImageElement()
    image.dataset.fallbackLevel = "external"
    image.src = RECIPE_IMAGE_FALLBACK_URL
    Object.defineProperty(image, "currentSrc", {
      configurable: true,
      value: RECIPE_IMAGE_FALLBACK_URL,
    })

    handleRecipeImageError({ currentTarget: image } as React.SyntheticEvent<HTMLImageElement>)

    expect(image.dataset.fallbackLevel).toBe("inline")
    expect(image.src).toContain("data:image/svg+xml")
  })

  it("hides the image after the last-resort fallback also fails", () => {
    const image = makeImageElement()
    image.dataset.fallbackLevel = "inline"

    handleRecipeImageError({ currentTarget: image } as React.SyntheticEvent<HTMLImageElement>)

    expect(image).toHaveClass("hidden")
  })
})
