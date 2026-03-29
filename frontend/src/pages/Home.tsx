import { Suspense, lazy, startTransition, useDeferredValue, useEffect, useMemo, useState } from "react"
import { Sparkles, Layers3, Compass } from "lucide-react"
import api from "@/services/api"
import type { RecipeDetail } from "@/components/RecipeModal"
import { HomeFeedGrid } from "@/components/HomeFeedGrid"
import type { HomeFeedCardRecipe } from "@/components/HomeFeedCard"
import { getHomeBackgroundImageUrl } from "@/lib/imageProxy"

interface RawFeedRecipe {
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

interface FeedResponse {
  title: string
  page: number
  limit: number
  total_found: number
  data: RawFeedRecipe[]
  category?: string
  keyword_used?: string
}

interface FeedSectionConfig {
  key: "foryou" | "category" | "discover"
  endpoint: string
  eyebrow: string
  title: string
  description: string
  icon: typeof Sparkles
}

const sectionConfigs: FeedSectionConfig[] = [
  {
    key: "foryou",
    endpoint: "/feed/foryou",
    eyebrow: "Recommendation",
    title: "Picked around your taste",
    description: "A tailored mix built from your profile, bookmarks, and what the system thinks will land well next.",
    icon: Sparkles,
  },
  {
    key: "category",
    endpoint: "/feed/category",
    eyebrow: "Suggest",
    title: "A category worth exploring",
    description: "A rotating lane of recipes from one category, useful when you want a tighter mood instead of a broad feed.",
    icon: Layers3,
  },
  {
    key: "discover",
    endpoint: "/feed/discover",
    eyebrow: "Discover",
    title: "Something a little unexpected",
    description: "Fresh ideas pulled from a random discovery keyword for when you want inspiration beyond your usual picks.",
    icon: Compass,
  },
]

const DEFAULT_ACTIVE_TAB: FeedSectionConfig["key"] = "foryou"
const FEED_PAGE_SIZE = 20
const HOME_BACKGROUND_IMAGE_URL = getHomeBackgroundImageUrl()

const LazyRecipeModal = lazy(async () => {
  const module = await import("@/components/RecipeModal")
  return { default: module.RecipeModal }
})

const getFirstImage = (image: string | string[] | null | undefined) => {
  if (!image || image === "n/a" || image === "nan") return null
  if (Array.isArray(image)) {
    return image.find((item) => item && item !== "n/a" && item !== "nan") ?? null
  }
  return image
}

function normalizeFeedRecipe(recipe: RawFeedRecipe): HomeFeedCardRecipe {
  return {
    id: String(recipe.id ?? recipe.RecipeId ?? ""),
    name: recipe.name ?? recipe.Name ?? "Untitled recipe",
    image: getFirstImage(recipe.image ?? recipe.Images),
    category: recipe.category ?? recipe.RecipeCategory ?? null,
    rating: Number(recipe.rating ?? recipe.AggregatedRating ?? 0),
    calories: Number(recipe.calories ?? recipe.Calories ?? 0),
    total_time: Number(recipe.total_time ?? recipe.TotalTimeMins ?? 0),
  }
}

function FeedCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white p-2 shadow-sm">
      <div className="aspect-[4/3] w-full animate-pulse rounded-[1.5rem] bg-zinc-200" />
      <div className="space-y-3 p-4">
        <div className="h-5 w-20 animate-pulse rounded-full bg-zinc-200" />
        <div className="h-6 w-3/4 animate-pulse rounded-xl bg-zinc-200" />
        <div className="flex items-center justify-between pt-2">
          <div className="h-4 w-20 animate-pulse rounded bg-zinc-200" />
          <div className="h-4 w-16 animate-pulse rounded bg-zinc-200" />
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [sections, setSections] = useState<Record<string, FeedResponse | null>>({})
  const [loadingSections, setLoadingSections] = useState<Record<string, boolean>>({
    foryou: false,
    category: false,
    discover: false,
  })
  const [activeTab, setActiveTab] = useState<FeedSectionConfig["key"]>(DEFAULT_ACTIVE_TAB)
  const [pageByTab, setPageByTab] = useState<Record<FeedSectionConfig["key"], number>>({
    foryou: 1,
    category: 1,
    discover: 1,
  })
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    async function fetchSection(sectionKey: FeedSectionConfig["key"]) {
      const section = sectionConfigs.find((item) => item.key === sectionKey)
      if (!section) return

      setLoadingSections((prev) => ({ ...prev, [sectionKey]: true }))

      try {
        const currentSection = sections[sectionKey]
        const response = await api.get<FeedResponse>(section.endpoint, {
          params: {
            page: pageByTab[sectionKey],
            limit: FEED_PAGE_SIZE,
            ...(sectionKey === "category" && currentSection?.category ? { category: currentSection.category } : {}),
            ...(sectionKey === "discover" && currentSection?.keyword_used ? { keyword: currentSection.keyword_used } : {}),
          },
        })
        startTransition(() => {
          setSections((prev) => ({ ...prev, [sectionKey]: response.data }))
        })
      } catch (error) {
        console.error(`Failed to fetch ${sectionKey} feed`, error)
        startTransition(() => {
          setSections((prev) => ({ ...prev, [sectionKey]: null }))
        })
      } finally {
        setLoadingSections((prev) => ({ ...prev, [sectionKey]: false }))
      }
    }

    fetchSection(activeTab)
  }, [activeTab, pageByTab])

  const handleOpenModal = async (id: string) => {
    setIsModalOpen(true)
    setLoadingDetail(true)
    try {
      const response = await api.get(`/search/${id}`)
      setSelectedRecipe(response.data)
    } catch (error) {
      console.error("Error fetching recipe details", error)
      setSelectedRecipe(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedRecipe(null), 300)
  }

  const activeSection = sectionConfigs.find((section) => section.key === activeTab) ?? sectionConfigs[0]
  const activeFeed = sections[activeTab]
  const activeLoading = loadingSections[activeTab]
  const ActiveIcon = activeSection.icon
  const normalizedRecipes = useMemo(
    () => activeFeed?.data?.map(normalizeFeedRecipe) ?? [],
    [activeFeed?.data],
  )
  const deferredRecipes = useDeferredValue(normalizedRecipes)
  const isGridStale = deferredRecipes !== normalizedRecipes
  const totalPages = activeFeed ? Math.max(Math.ceil(activeFeed.total_found / activeFeed.limit), 1) : 1
  const currentPage = pageByTab[activeTab]

  const handleTabChange = (tab: FeedSectionConfig["key"]) => {
    setActiveTab(tab)
  }

  const handlePageChange = (page: number) => {
    setPageByTab((prev) => ({ ...prev, [activeTab]: page }))
  }

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-no-repeat font-sans text-zinc-900"
      style={{ backgroundImage: `url('${HOME_BACKGROUND_IMAGE_URL}')` }}
    >
      <div className="absolute inset-0 bg-white/65 backdrop-blur-[2px]" />

      <main className="relative mx-auto max-w-[1500px] px-6 py-8 md:px-8 lg:px-10">
        <div className="mb-10 rounded-[2.5rem] border border-zinc-200/70 bg-white/90 p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Home Feed</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">Explore what to cook </h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-600 md:text-lg">
            Switch between recommendation, suggest, and discover from one place. We only load the lane you open, so the page stays fast while the full menu remains visible.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {sectionConfigs.map((section) => {
              const TabIcon = section.icon
              const isActive = section.key === activeTab

              return (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => handleTabChange(section.key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {section.eyebrow}
                </button>
              )
            })}
          </div>
        </div>

        <section className="space-y-5">
          <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200/70 bg-white/90 p-6 shadow-sm md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                <ActiveIcon className="h-3.5 w-3.5" />
                {activeSection.eyebrow}
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">{activeSection.title}</h2>
              <p className="mt-2 text-zinc-600">{activeSection.description}</p>
            </div>

            {activeFeed?.title && (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                {activeFeed.category ?? activeFeed.keyword_used ?? activeFeed.title}
              </div>
            )}
          </div>

          {activeLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: FEED_PAGE_SIZE }, (_, index) => (
                <FeedCardSkeleton key={`${activeTab}-skeleton-${index}`} />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <HomeFeedGrid
                recipes={deferredRecipes}
                currentPage={currentPage}
                isStale={isGridStale}
                onOpenRecipe={handleOpenModal}
              />

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="text-sm font-medium text-zinc-500">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <Suspense fallback={null}>
        <LazyRecipeModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          recipe={selectedRecipe}
          loading={loadingDetail}
        />
      </Suspense>
    </div>
  )
}
