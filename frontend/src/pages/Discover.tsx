import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Compass, Clock, Flame, Star, ImageOff } from "lucide-react"
import api from "@/services/api"
import { RecipeModal, type RecipeDetail } from "@/components/RecipeModal"

interface DiscoverRecipe {
  id: string
  name: string
  image: string | null
  category: string | null
  rating: number
  calories: number
  total_time: number
}

interface DiscoverResponse {
  title: string
  keyword_used?: string
  data: DiscoverRecipe[]
}

const getFirstImage = (image: string | null) => {
  if (!image || image === "n/a" || image === "nan") return null
  return image
}

export default function Discover() {
  const [discoverFeed, setDiscoverFeed] = useState<DiscoverResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    async function fetchDiscoverFeed() {
      try {
        const response = await api.get<DiscoverResponse>("/feed/discover")
        setDiscoverFeed(response.data)
      } catch (error) {
        console.error("Failed to fetch discover feed", error)
        setDiscoverFeed(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDiscoverFeed()
  }, [])

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

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-zinc-900">
      <main className="mx-auto max-w-[1500px] px-6 py-8 md:px-8 lg:px-10">
        <div className="mb-10 rounded-[2.5rem] border border-zinc-200/70 bg-white/90 p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            <Compass className="h-3.5 w-3.5" />
            Discovery
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">A lighter lane for unexpected ideas</h1>
          <p className="mt-3 max-w-3xl text-base text-zinc-600 md:text-lg">
            This page uses the discovery feed directly, so the set feels more exploratory and less tied to your usual patterns.
          </p>
          {discoverFeed?.keyword_used && (
            <div className="mt-5 inline-flex rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
              Keyword in this round: {discoverFeed.keyword_used}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={`discover-skeleton-${index}`}
                className="overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white p-2 shadow-sm"
              >
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
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {discoverFeed?.data?.map((recipe, index) => {
              const imageUrl = getFirstImage(recipe.image)

              return (
                <motion.button
                  key={recipe.id}
                  type="button"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                  className="group overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white p-2 text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                  onClick={() => handleOpenModal(recipe.id)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-zinc-100">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={recipe.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                        <ImageOff className="h-8 w-8 text-zinc-300" />
                      </div>
                    )}

                    <div className="absolute left-3 top-3 flex w-[calc(100%-24px)] items-start justify-between gap-2">
                      {recipe.category && recipe.category !== "n/a" ? (
                        <span className="rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-zinc-800 shadow-sm backdrop-blur">
                          {recipe.category}
                        </span>
                      ) : (
                        <span />
                      )}

                      {recipe.rating > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/90 px-2.5 py-1 text-xs font-bold text-yellow-900 shadow-sm backdrop-blur">
                          <Star className="h-3 w-3 fill-yellow-900" />
                          {recipe.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-zinc-900 transition-colors group-hover:text-blue-600">
                      {recipe.name}
                    </h3>
                    <div className="mt-4 flex items-center justify-between text-sm font-medium text-zinc-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {recipe.total_time ? `${recipe.total_time} min` : "N/A"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Flame className="h-4 w-4 text-orange-500" />
                        {recipe.calories ? `${Math.round(recipe.calories)} cal` : "N/A"}
                      </span>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </main>

      <RecipeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        recipe={selectedRecipe}
        loading={loadingDetail}
      />
    </div>
  )
}
