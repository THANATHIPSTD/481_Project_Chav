import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Search as SearchIcon, ArrowRight, Star, Clock, Flame, ChevronLeft, ChevronRight, ImageOff } from "lucide-react"
import api from "@/services/api"
import { RecipeModal, type RecipeDetail } from "@/components/RecipeModal"

interface Recipe {
  id: string
  name: string
  image: string
  category: string
  rating: number
  calories: number
  total_time: number
}

interface SearchResponse {
  results: Recipe[]
  total_found: number
  did_you_mean: string | null
  page: number
  limit: number
}

interface AutocompleteOption {
  id: string
  name: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Data state
  const [queryInput, setQueryInput] = useState(searchParams.get("q") || "")
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteOption[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [showAuto, setShowAuto] = useState(false)
  
  const debouncedQuery = useDebounce(queryInput, 300)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Search Results State
  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)

  // Modal State
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const handleOpenModal = async (id: string) => {
    setIsModalOpen(true)
    setLoadingDetail(true)
    try {
      const res = await api.get(`/search/${id}`)
      setSelectedRecipe(res.data)
    } catch (err) {
      console.error("Error fetching recipe details", err)
      setSelectedRecipe(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setTimeout(() => setSelectedRecipe(null), 300)
  }

  const currentQuery = searchParams.get("q") || ""
  const currentPage = parseInt(searchParams.get("page") || "1", 10)

  // Fetch Autocomplete
  useEffect(() => {
    async function fetchAutocomplete() {
      if (debouncedQuery.trim().length < 2) {
        setAutocompleteResults([])
        return
      }
      try {
        const res = await api.get(`/search/autocomplete?q=${encodeURIComponent(debouncedQuery)}`)
        setAutocompleteResults(res.data)
      } catch (err) {
        console.error("Autocomplete error", err)
      }
    }
    fetchAutocomplete()
  }, [debouncedQuery])

  // Fetch main search
  useEffect(() => {
    if (!currentQuery) {
      setData(null)
      return
    }

    async function fetchSearch() {
      setLoading(true)
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(currentQuery)}&page=${currentPage}&limit=15`)
        setData(res.data)
      } catch (err) {
        console.error("Search error", err)
      } finally {
        setLoading(false)
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
    }
    fetchSearch()
  }, [currentQuery, currentPage])

  // Focus click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowAuto(false)
        setIsFocused(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearchSubmit = (e?: React.FormEvent, overrideQ?: string) => {
    if (e) e.preventDefault()
    const finalQ = overrideQ ?? queryInput
    if (!finalQ.trim()) return
    setShowAuto(false)
    setIsFocused(false)
    setSearchParams({ q: finalQ.trim(), page: "1" })
  }

  const totalPages = data ? Math.ceil(data.total_found / data.limit) : 1
  const skeletonItems = Array.from({ length: 15 }, (_, i) => i)

  const isSearchActive = !!currentQuery || loading;

  return (
    <div className="min-h-screen font-sans text-zinc-900 pb-20 relative">
      {/* Fixed Background Layer with Conditional Blur Overlay */}
      <div 
        className="fixed inset-0 z-[-1] bg-cover bg-center bg-no-repeat transition-transform duration-700"
        style={{ backgroundImage: "url('https://img1.pic.in.th/images/11309251.png')" }}
      >
        <div className={`absolute inset-0 transition-all duration-700 ${
          isSearchActive ? 'bg-white/40 backdrop-blur-sm' : 'bg-transparent backdrop-blur-none'
        }`} />
      </div>
      
      {/* GIANT SEARCH BAR SECTION */}
      <motion.div 
        layout
        className={`w-full transition-colors duration-500 flex flex-col ${
          isSearchActive 
            ? "border-b border-zinc-200/60 bg-white/95 backdrop-blur-xl py-6 md:py-10 shadow-sm" 
            : "min-h-[85vh] items-center justify-center bg-transparent"
        }`}
      >
        <div className={`mx-auto w-full max-w-[1500px] px-4 md:px-8 lg:px-10 transition-all duration-500 ${isSearchActive ? "" : "-mt-20"}`}>
          <motion.div 
            layout 
            className="text-center mb-8"
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 mb-4 drop-shadow-sm">
              What are you craving?
            </h1>
            <p className={`text-lg font-medium drop-shadow-sm ${isSearchActive ? 'text-zinc-500' : 'text-zinc-700'}`}>
              Discover recipes, ingredients, and inspiration.
            </p>
          </motion.div>

          <div className="relative mx-auto w-full max-w-5xl" ref={wrapperRef}>
            <form 
              onSubmit={handleSearchSubmit} 
              className={`relative flex items-center w-full overflow-hidden rounded-full border bg-white shadow-sm transition-all duration-300 ${
                isFocused ? 'ring-4 ring-zinc-900/10 border-zinc-400' : 'border-zinc-300 hover:border-zinc-400'
              }`}
            >
              <div className="pl-6 pr-2 text-zinc-400">
                <SearchIcon className="h-6 w-6" />
              </div>
              <input
                className="h-16 w-full bg-transparent px-4 text-lg font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                placeholder="Search for chicken, pasta, keto..."
                value={queryInput}
                onChange={(e) => {
                  setQueryInput(e.target.value)
                  setShowAuto(true)
                }}
                onFocus={() => {
                  setIsFocused(true)
                  setShowAuto(true)
                }}
              />
              <button 
                type="submit"
                disabled={!queryInput.trim()}
                className="mr-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-all hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>

            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {showAuto && autocompleteResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 right-0 mt-3 overflow-hidden rounded-3xl border border-zinc-200 bg-white/80 backdrop-blur-2xl shadow-2xl z-50"
                >
                  <ul className="py-2">
                    {autocompleteResults.map((opt) => (
                      <li key={opt.id}>
                        <button
                          type="button"
                          className="flex w-full items-center px-6 py-3 text-left transition-colors hover:bg-zinc-100/80 focus:bg-zinc-100 focus:outline-none"
                          onClick={() => {
                            setQueryInput(opt.name)
                            handleSearchSubmit(undefined, opt.name)
                          }}
                        >
                          <SearchIcon className="mr-4 h-4 w-4 text-zinc-400" />
                          <span className="font-medium text-zinc-900">{opt.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* SEARCH RESULTS SECTION */}
      <main className="mx-auto w-full max-w-[1500px] px-4 py-8 md:px-8 lg:px-10">
        
        {loading && (
          <div>
            <div className="mb-8 space-y-3">
              <div className="h-8 w-64 animate-pulse rounded-xl bg-zinc-200" />
              <div className="h-5 w-40 animate-pulse rounded-lg bg-zinc-200" />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {skeletonItems.map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white p-2 shadow-sm"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-zinc-100">
                    <div className="h-full w-full animate-pulse bg-zinc-200" />
                  </div>
                  <div className="space-y-3 p-4">
                    <div className="h-5 w-3/4 animate-pulse rounded-lg bg-zinc-200" />
                    <div className="h-5 w-1/2 animate-pulse rounded-lg bg-zinc-200" />
                    <div className="pt-2 flex items-center justify-between">
                      <div className="h-4 w-16 animate-pulse rounded bg-zinc-200" />
                      <div className="h-4 w-20 animate-pulse rounded bg-zinc-200" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && data && currentQuery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">
                  Results for "<span className="text-zinc-500">{currentQuery}</span>"
                </h2>
                <p className="mt-1 text-zinc-500">{data.total_found} recipes found</p>
              </div>

              {/* Did You Mean Suggestion */}
              {data.did_you_mean && (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-sm text-blue-800">
                  <span className="font-medium">Did you mean:</span>
                  <button
                    onClick={() => {
                      setQueryInput(data.did_you_mean!)
                      handleSearchSubmit(undefined, data.did_you_mean!)
                    }}
                    className="font-bold underline decoration-blue-300 underline-offset-4 hover:text-blue-900"
                  >
                    {data.did_you_mean}
                  </button>
                  <span className="ml-1">?</span>
                </div>
              )}
            </div>

            {/* RECIPE CARDS GRID */}
            {data.results.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-[2rem] border border-zinc-200 border-dashed bg-white">
                <SearchIcon className="mb-4 h-12 w-12 text-zinc-300" />
                <h3 className="text-lg font-semibold text-zinc-900">No recipes found</h3>
                <p className="mt-1 text-zinc-500">Try adjusting your search or typo settings.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {data.results.map((recipe, index) => (
                  <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white p-2 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                    onClick={() => handleOpenModal(recipe.id)}
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-zinc-100">
                      {recipe.image && recipe.image !== "n/a" && recipe.image !== "nan" ? (
                        <img 
                            src={recipe.image} 
                            alt={recipe.name} 
                            loading="lazy"         
                            decoding="async"       
                            className="h-full w-full object-cover opacity-0 transition-all duration-700 hover:scale-105"
                            onLoad={(e) => {
                              (e.target as HTMLImageElement).classList.remove('opacity-0');
                              (e.target as HTMLImageElement).classList.add('opacity-100');
                            }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = ""; // fallback
                              (e.target as HTMLImageElement).classList.add('hidden');
                            }}
                          />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                          <ImageOff className="h-8 w-8 text-zinc-300" />
                        </div>
                      )}
                      
                      {/* Top Badges */}
                      <div className="absolute left-3 top-3 flex gap-2 w-[calc(100%-24px)] justify-between">
                        {recipe.category && recipe.category !== "n/a" && (
                          <div className="rounded-full bg-white/90 px-3 py-1 font-semibold text-xs text-zinc-800 shadow-sm backdrop-blur-md">
                            {recipe.category}
                          </div>
                        )}
                        {recipe.rating > 0 && (
                          <div className="flex items-center gap-1 rounded-full bg-yellow-400/90 px-2 py-1 text-xs font-bold text-yellow-900 shadow-sm backdrop-blur-md">
                            <Star className="h-3 w-3 fill-yellow-900" />
                            {recipe.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col p-4">
                      <h3 className="line-clamp-2 text-lg font-bold leading-tight tracking-tight text-zinc-900 transition-colors group-hover:text-blue-600">
                        {recipe.name}
                      </h3>
                      
                      <div className="mt-auto pt-4 flex items-center justify-between text-zinc-500">
                        {/* Time */}
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <Clock className="h-4 w-4" />
                          {recipe.total_time ? `${recipe.total_time} min` : 'N/A'}
                        </div>
                        {/* Calories */}
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <Flame className="h-4 w-4 text-orange-500" />
                          {recipe.calories ? `${Math.round(recipe.calories)} cal` : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-4">
                <button
                  onClick={() => setSearchParams({ q: currentQuery, page: String(currentPage - 1) })}
                  disabled={currentPage <= 1}
                  className="flex h-12 items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 transition-hover hover:bg-zinc-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <div className="text-sm font-medium text-zinc-500">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setSearchParams({ q: currentQuery, page: String(currentPage + 1) })}
                  disabled={currentPage >= totalPages}
                  className="flex h-12 items-center gap-2 rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 transition-hover hover:bg-zinc-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

          </motion.div>
        )}
      </main>

      {/* Recipe Modal */}
      <RecipeModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        recipe={selectedRecipe}
        loading={loadingDetail}
      />
    </div>
  )
}
