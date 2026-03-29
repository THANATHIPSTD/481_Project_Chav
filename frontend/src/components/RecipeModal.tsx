/* eslint-disable react-hooks/set-state-in-effect */
import { motion, AnimatePresence } from "framer-motion"
import { X, Clock, Flame, Star, ChefHat, Info, ChevronDown, ChevronUp, BookmarkPlus, BookmarkMinus } from "lucide-react"
import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { BookmarkModal } from "./BookmarkModal"
import { authService } from "@/services/AuthService"
import { bookmarkService, type BookmarkStatus } from "@/services/bookmarkService"
import { handleRecipeImageError, handleRecipeImageLoad } from "@/lib/imageFallback"
import { getDetailImageAttributes } from "@/lib/imageProxy"
import type { RecipeDetail } from "@/types/recipe"

interface RecipeModalProps {
  isOpen: boolean
  onClose: () => void
  onBookmarkRemoved?: () => void
  recipe: RecipeDetail | null
  loading: boolean
}

export function RecipeModal({ isOpen, onClose, onBookmarkRemoved, recipe, loading }: RecipeModalProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showAllInstructions, setShowAllInstructions] = useState(false)
  const [currentImageIdx, setCurrentImageIdx] = useState(0)
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const [bookmarkInfo, setBookmarkInfo] = useState<BookmarkStatus | null>(null)
  const isLoggedIn = authService.isAuthenticated()

  // Reset states when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      setShowAllInstructions(false)
      setCurrentImageIdx(0)
      setIsBookmarkModalOpen(false)
      setBookmarkInfo(null)
      setShowSuccess(false)
    } else if (recipe && recipe.id && isLoggedIn) {
        bookmarkService
          .checkBookmarkStatus(recipe.id)
          .then((status) => setBookmarkInfo(status))
          .catch((err) => console.error("Could not check bookmark status", err))
    } else if (recipe && recipe.id) {
        setBookmarkInfo({ isBookmarked: false })
    }
  }, [isOpen, recipe, isLoggedIn])

  const handleRemoveBookmark = async () => {
    if (bookmarkInfo?.bookmarkId) {
        try {
            await bookmarkService.removeBookmark(bookmarkInfo.bookmarkId)
            setBookmarkInfo({ isBookmarked: false })
            if (onBookmarkRemoved) onBookmarkRemoved()
        } catch (err) {
            console.error(err)
            alert('Failed to remove bookmark')
        }
    }
  }

  const handleRequireLogin = () => {
    const nextPath = `${location.pathname}${location.search}`
    navigate(authService.buildLoginPath(nextPath))
  }

  if (!isOpen) return null

  // Function to get the all images as array
  const getAllImages = (images: string | string[]) => {
    if (!images || images === "n/a" || images === "nan") return []
    if (typeof images === "string") {
      const cleaned = images.replace(/c\("/g, '').replace(/"\)/g, '')
      const urlArray = cleaned.split(", ").map(u => u.trim().replace(/['"]/g, ''))
      return urlArray.filter(url => url.startsWith("http"))
    }
    if (Array.isArray(images) && images.length > 0) return images
    return []
  }

  const imagesArray = recipe ? getAllImages(recipe.Images) : []
  const hasImages = imagesArray.length > 0
  const currentImage = hasImages ? getDetailImageAttributes(imagesArray[currentImageIdx]) : null

  const nextImage = () => {
    setCurrentImageIdx((prev) => (prev + 1) % imagesArray.length)
  }

  const prevImage = () => {
    setCurrentImageIdx((prev) => (prev - 1 + imagesArray.length) % imagesArray.length)
  }

  // Clean instructions
  const getInstructions = (inst: string) => {
    if (!inst) return []
    // Instructions often end with "., " or just ". "
    return inst.replace(/c\("/g, '').replace(/"\)/g, '')
               .split('., ')
               .map(step => step.replace(/['",]/g, '').trim())
               .filter(step => step.length > 0)
  }

  // Clean ingredients
  const getIngredients = (ing: string) => {
    if (!ing) return []
    return ing.replace(/c\("/g, '').replace(/"\)/g, '')
              .split(',')
              .map(item => item.replace(/['"]/g, '').trim())
              .filter(item => item.length > 0)
  }

  return (
    <>
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12 ">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl pb-4"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-zinc-600 shadow-sm backdrop-blur-md transition-colors hover:bg-white hover:text-zinc-900"
          >
            <X className="h-5 w-5" />
          </button>

          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <ChefHat className="h-10 w-10 animate-bounce text-zinc-400" />
                <p className="text-zinc-500 font-medium">Cooking up details...</p>
              </div>
            </div>
          ) : recipe ? (
            <div className="flex h-full flex-col w-full md:flex-row overflow-hidden relative">
              
              {/* Left Column - Image & Nutrition */}
              <div className="w-full md:w-5/12 lg:w-2/5 flex flex-col bg-zinc-50 p-6 md:p-8 shrink-0 overflow-y-auto">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-zinc-200 shadow-sm group">
                  {hasImages ? (
                    <>
                      <img 
                        src={currentImage?.src} 
                        srcSet={currentImage?.srcSet}
                        sizes={currentImage?.sizes}
                        alt={`${recipe.Name} image ${currentImageIdx + 1}`} 
                        className="h-full w-full object-cover opacity-0 transition-opacity duration-500"
                        decoding="async"
                        onLoad={handleRecipeImageLoad}
                        onError={handleRecipeImageError}
                      />
                      {imagesArray.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-zinc-800 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-110 opacity-0 group-hover:opacity-100"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-zinc-800 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:scale-110 opacity-0 group-hover:opacity-100"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md">
                            {imagesArray.map((_, idx) => (
                              <div
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  idx === currentImageIdx ? "w-4 bg-white" : "w-1.5 bg-white/50"
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                      <ChefHat className="h-12 w-12 text-zinc-300" />
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-bold text-zinc-900 mb-4 flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" /> 
                    Nutrition Facts
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-white p-4 border border-zinc-200/60 shadow-sm">
                      <div className="text-sm font-medium text-zinc-500">Calories</div>
                      <div className="mt-1 text-xl font-bold text-orange-500">{recipe.Calories} <span className="text-xs font-normal text-zinc-400">kcal</span></div>
                    </div>
                    <div className="rounded-xl bg-white p-4 border border-zinc-200/60 shadow-sm">
                      <div className="text-sm font-medium text-zinc-500">Protein</div>
                      <div className="mt-1 text-xl font-bold text-blue-500">{recipe.ProteinContent} <span className="text-xs font-normal text-zinc-400">g</span></div>
                    </div>
                    <div className="rounded-xl bg-white p-4 border border-zinc-200/60 shadow-sm">
                      <div className="text-sm font-medium text-zinc-500">Carbs</div>
                      <div className="mt-1 text-xl font-bold text-green-500">{recipe.CarbohydrateContent} <span className="text-xs font-normal text-zinc-400">g</span></div>
                    </div>
                    <div className="rounded-xl bg-white p-4 border border-zinc-200/60 shadow-sm">
                      <div className="text-sm font-medium text-zinc-500">Fat</div>
                      <div className="mt-1 text-xl font-bold text-red-500">{recipe.FatContent} <span className="text-xs font-normal text-zinc-400">g</span></div>
                    </div>
                  </div>
                </div>

                {/* Bookmark UI */}
                <div className="mt-8 pt-8 border-t border-zinc-200/80">
                  <AnimatePresence mode="wait">
                    {showSuccess ? (
                      <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full flex items-center justify-center gap-3 rounded-2xl bg-green-500 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-green-200"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1, type: "spring", stiffness: 500 }}
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <motion.path 
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.3, delay: 0.2 }}
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={3} 
                              d="M5 13l4 4L19 7" 
                            />
                          </svg>
                        </motion.div>
                        Saved successfully!
                      </motion.div>
                    ) : bookmarkInfo?.isBookmarked ? (
                    <motion.button
                      key="remove"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={handleRemoveBookmark}
                      className="w-full flex items-center justify-center gap-3 rounded-2xl bg-red-50 px-6 py-4 text-lg font-bold text-red-600 transition-all hover:bg-red-100 hover:text-red-700 hover:shadow-md border border-red-200/50 group"
                    >
                      <BookmarkMinus className="h-6 w-6 transition-transform group-hover:scale-110" />
                      Remove Bookmark
                    </motion.button>
                  ) : (
                    <motion.div
                      key="save"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <button
                        onClick={() => {
                          if (!isLoggedIn) {
                            handleRequireLogin()
                            return
                          }
                          setIsBookmarkModalOpen((prev) => !prev)
                        }}
                        className="w-full flex items-center justify-center gap-3 rounded-2xl bg-yellow-300 px-6 py-4 text-lg font-bold text-black transition-all hover:bg-zinc-800  hover:text-white hover:shadow-lg hover:-translate-y-0.5 group"
                      >
                        <BookmarkPlus className="h-6 w-6 transition-transform group-hover:scale-110" />
                        {!isLoggedIn ? "Log In to Save" : isBookmarkModalOpen ? "Close Save Panel" : "Save Recipe"}
                      </button>

                      {!isLoggedIn ? (
                        <p className="mt-3 text-center text-sm text-zinc-500">
                          Sign in first to save recipes to your folders.
                        </p>
                      ) : (
                        <BookmarkModal
                          isOpen={isBookmarkModalOpen}
                          onClose={() => setIsBookmarkModalOpen(false)}
                          onSaved={(bookmarkId) => {
                            setBookmarkInfo({ isBookmarked: true, bookmarkId })
                            setIsBookmarkModalOpen(false)
                            setShowSuccess(true)
                            setTimeout(() => setShowSuccess(false), 2000)
                          }}
                          recipeId={recipe.id}
                          recipeName={recipe.Name}
                        />
                      )}
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Column - Content */}
              <div className="w-full h-full md:w-7/12 lg:w-3/5 p-6 md:p-10 md:pl-12 flex flex-col gap-8 overflow-y-auto">
                
                {/* Header Info */}
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 font-semibold text-xs text-zinc-600">
                      {recipe.RecipeCategory}
                    </span>
                    <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {recipe.AggregatedRating}
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h2 className="text-3xl md:text-4xl font-black text-zinc-900 leading-tight">
                      {recipe.Name}
                    </h2>
                  </div>
                  
                  {recipe.Description && recipe.Description !== "n/a" && (
                    <p className="text-zinc-600 text-base leading-relaxed">
                      {recipe.Description}
                    </p>
                  )}

                  {/* Time info dots */}
                  <div className="mt-6 flex flex-wrap gap-6 items-center">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Prep</div>
                        <div className="text-sm font-bold text-zinc-900">{recipe.PrepTimeMins} min</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                        <Flame className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cook</div>
                        <div className="text-sm font-bold text-zinc-900">{recipe.CookTimeMins} min</div>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-zinc-200 hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Time</div>
                        <div className="text-lg font-black text-zinc-900">{recipe.TotalTimeMins} min</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-zinc-100"></div>

                {/* Main Content Sections: Ingredients */}
                <div className="flex flex-col gap-10">
                  {/* Ingredients */}
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-5 flex items-center gap-2">
                      Ingredients
                    </h3>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                      {getIngredients(recipe.RecipeIngredientParts).map((ing, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"></div>
                          <span className="text-zinc-700 capitalize-first leading-relaxed pr-2">{ing}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 mb-5 flex items-center gap-2">
                      Instructions
                    </h3>
                    <div className="space-y-4">
                      {getInstructions(recipe.RecipeInstructions)
                        .slice(0, showAllInstructions ? undefined : 3)
                        .map((step, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[10px] font-bold text-white">
                            {idx + 1}
                          </div>
                          <p className="text-zinc-700 text-sm pt-0.5 leading-relaxed">{step.replace(/^\d+\.\s*/, '')}</p>
                        </div>
                      ))}
                    </div>
                    {getInstructions(recipe.RecipeInstructions).length > 3 && (
                      <button
                        onClick={() => setShowAllInstructions(!showAllInstructions)}
                        className="mt-5 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        {showAllInstructions ? (
                          <>
                            Show Less <ChevronUp className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Show More ({getInstructions(recipe.RecipeInstructions).length - 3} more steps) <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-zinc-500">
              Recipe not found.
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>

    </>
  )
}
