/* eslint-disable react-hooks/exhaustive-deps */
import { Suspense, lazy, useEffect, useState } from "react"
import { Compass } from "lucide-react"
import { feedService, type FeedResponse } from "@/services/feedService"
import { recipeService } from "@/services/recipeService"
import { HomeFeedGrid } from "@/components/HomeFeedGrid"
import type { RecipeDetail } from "@/types/recipe"

const LazyRecipeModal = lazy(async () => {
  const module = await import("@/components/RecipeModal")
  return { default: module.RecipeModal }
})

const DISCOVER_PAGE_SIZE = 20

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

export default function Discover() {
  const [discoverFeed, setDiscoverFeed] = useState<FeedResponse | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    async function fetchDiscoverFeed() {
      setLoading(true)
      try {
        const response = await feedService.getDiscoverFeed(page, DISCOVER_PAGE_SIZE, discoverFeed?.keywordUsed)
        setDiscoverFeed(response)
      } catch (error) {
        console.error("Failed to fetch discover feed", error)
        setDiscoverFeed(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDiscoverFeed()
  }, [page])

  const handleOpenModal = async (id: string) => {
    setIsModalOpen(true)
    setLoadingDetail(true)
    try {
      setSelectedRecipe(await recipeService.getRecipeDetail(id))
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

  const totalPages = discoverFeed ? Math.max(Math.ceil(discoverFeed.totalFound / discoverFeed.limit), 1) : 1

  return (
    <div className="min-h-screen font-sans text-zinc-900 pb-20 relative">
      {/* Fixed Background Layer with Blur Overlay */}
      <div 
        className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat transition-transform duration-700"
        style={{ backgroundImage: "url('https://img1.pic.in.th/images/11309251.png')" }}
      >
        <div className="absolute inset-0 bg-white/40 backdrop-blur-sm" />
      </div>

      <main className="relative mx-auto max-w-[1500px] px-6 py-8 md:px-8 lg:px-10">
        <div className="mb-10 rounded-[2.5rem] border border-zinc-200/70 bg-white/90 p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            <Compass className="h-3.5 w-3.5" />
            Discovery
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">A lighter lane for unexpected ideas</h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-600 md:text-lg">
            This page uses the discovery feed directly, so the set feels more exploratory and less tied to your usual patterns.
          </p>
          {discoverFeed?.keywordUsed && (
            <div className="mt-5 inline-flex rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Keyword in this round: {discoverFeed.keywordUsed}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: DISCOVER_PAGE_SIZE }, (_, index) => (
              <FeedCardSkeleton key={`discover-skeleton-${index}`} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <HomeFeedGrid
              recipes={discoverFeed?.data ?? []}
              currentPage={page}
              isStale={false}
              onOpenRecipe={handleOpenModal}
            />

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="text-sm font-medium text-zinc-500">
                  Page {page} of {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
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
