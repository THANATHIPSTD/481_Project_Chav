import { describe, expect, it } from "vitest"

import {
  HOME_BACKGROUND_SOURCE_URL,
  getDetailImageAttributes,
  getHomeBackgroundImageUrl,
  getHomeCardImageAttributes,
  getOptimizedImageUrl,
} from "@/lib/imageProxy"

describe("imageProxy helpers", () => {
  it("builds optimized image URLs with width and quality parameters", () => {
    const result = getOptimizedImageUrl("https://images.example.com/meal.jpg", 640, 80)

    expect(result).toContain("/api/feed/image?")
    expect(result).toContain("url=https%3A%2F%2Fimages.example.com%2Fmeal.jpg")
    expect(result).toContain("w=640")
    expect(result).toContain("q=80")
  })

  it("returns responsive attributes for home cards", () => {
    const attrs = getHomeCardImageAttributes("https://images.example.com/meal.jpg")

    expect(attrs.src).toContain("w=640")
    expect(attrs.srcSet).toContain("320w")
    expect(attrs.srcSet).toContain("640w")
    expect(attrs.srcSet).toContain("960w")
    expect(attrs.sizes).toContain("100vw")
  })

  it("returns responsive attributes for detail images", () => {
    const attrs = getDetailImageAttributes("https://images.example.com/meal.jpg")

    expect(attrs.src).toContain("w=960")
    expect(attrs.srcSet).toContain("640w")
    expect(attrs.srcSet).toContain("960w")
    expect(attrs.srcSet).toContain("1280w")
    expect(attrs.sizes).toContain("40vw")
  })

  it("builds the home background URL from the configured source", () => {
    const result = getHomeBackgroundImageUrl()

    expect(result).toContain(encodeURIComponent(HOME_BACKGROUND_SOURCE_URL))
    expect(result).toContain("w=1920")
    expect(result).toContain("q=72")
  })
})
