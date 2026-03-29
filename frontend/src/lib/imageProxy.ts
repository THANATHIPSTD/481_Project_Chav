const IMAGE_PROXY_BASE = `${import.meta.env.VITE_API_BASE ?? "/api"}/feed/image`

export const HOME_BACKGROUND_SOURCE_URL = "https://img1.pic.in.th/images/11309251.png"

const HOME_CARD_WIDTHS = [320, 640, 960] as const
const DETAIL_IMAGE_WIDTHS = [640, 960, 1280] as const

export function getOptimizedImageUrl(sourceUrl: string, width: number, quality = 76) {
  const params = new URLSearchParams({
    url: sourceUrl,
    w: String(width),
    q: String(quality),
  })

  return `${IMAGE_PROXY_BASE}?${params.toString()}`
}

export function getHomeCardImageAttributes(sourceUrl: string) {
  return {
    src: getOptimizedImageUrl(sourceUrl, 640, 76),
    srcSet: HOME_CARD_WIDTHS.map((width) => `${getOptimizedImageUrl(sourceUrl, width, 76)} ${width}w`).join(", "),
    sizes:
      "(min-width: 1536px) 18vw, (min-width: 1280px) 23vw, (min-width: 1024px) 31vw, (min-width: 640px) 48vw, 100vw",
  }
}

export function getDetailImageAttributes(sourceUrl: string) {
  return {
    src: getOptimizedImageUrl(sourceUrl, 960, 80),
    srcSet: DETAIL_IMAGE_WIDTHS.map((width) => `${getOptimizedImageUrl(sourceUrl, width, 80)} ${width}w`).join(", "),
    sizes: "(min-width: 1024px) 40vw, (min-width: 768px) 45vw, 100vw",
  }
}

export function getHomeBackgroundImageUrl() {
  return getOptimizedImageUrl(HOME_BACKGROUND_SOURCE_URL, 1920, 72)
}
