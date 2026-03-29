/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense, lazy, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Folder, Bookmark, Trash2, Plus, Star, ImageOff, BookmarkMinus, Sparkles, Clock, Flame } from "lucide-react"

import { ConfirmModal } from "../components/ConfirmModal"
import { handleRecipeImageError, handleRecipeImageLoad } from "@/lib/imageFallback"
import { bookmarkService } from "@/services/bookmarkService"
import { folderService, type Folder as FolderRecord, type FolderBookmarkEntry } from "@/services/folderService"
import { recipeService } from "@/services/recipeService"
import type { RecipeDetail, RecipePreview } from "@/types/recipe"

const LazyRecipeModal = lazy(async () => {
  const module = await import("@/components/RecipeModal")
  return { default: module.RecipeModal }
})

const getFirstImage = (images: any) => {
  if (!images || images === "n/a" || images === "nan") return null
  if (typeof images === "string") {
    const cleaned = images.replace(/c\("/g, "").replace(/"\)/g, "")
    const urlArray = cleaned.split(", ").map((url) => url.trim().replace(/['"]/g, ""))
    const validUrls = urlArray.filter((url) => url.startsWith("http"))
    return validUrls.length > 0 ? validUrls[0] : null
  }
  if (Array.isArray(images) && images.length > 0) return images[0]
  return null
}

const getIngredients = (ingredients: any) => {
  if (!ingredients || ingredients === "n/a" || ingredients === "nan") return []
  if (typeof ingredients === "string") {
    return ingredients
      .replace(/c\("/g, "")
      .replace(/"\)/g, "")
      .split(",")
      .map((item: string) => item.replace(/['"]/g, "").trim())
      .filter((item: string) => item.length > 0)
  }
  return []
}

export default function Bookmarks() {
  const [folders, setFolders] = useState<FolderRecord[]>([])
  const [selectedFolder, setSelectedFolder] = useState<FolderRecord | null>(null)
  const [bookmarks, setBookmarks] = useState<FolderBookmarkEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<RecipePreview[]>([])
  const [recommendationTitle, setRecommendationTitle] = useState("")
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null)
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false)
  const [loadingRecipeDetail, setLoadingRecipeDetail] = useState(false)

  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
  const [bookmarkToDelete, setBookmarkToDelete] = useState<string | null>(null)

  useEffect(() => {
    void fetchFolders()
  }, [])

  useEffect(() => {
    if (selectedFolder) {
      void fetchBookmarks(selectedFolder.id)
      void fetchRecommendations(selectedFolder.id)
    }
  }, [selectedFolder])

  const fetchFolders = async () => {
    try {
      const nextFolders = await folderService.getFolders()
      setFolders(nextFolders)
      if (nextFolders.length > 0) {
        setSelectedFolder((currentFolder) => currentFolder ?? nextFolders[0])
      }
    } catch (error) {
      console.error(error)
    }
  }

  const fetchBookmarks = async (folderId: string) => {
    setLoading(true)
    try {
      setBookmarks(await folderService.getFolderBookmarks(folderId))
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecommendations = async (folderId: string) => {
    setLoadingRecommendations(true)
    try {
      const response = await folderService.getFolderRecommendations(folderId)
      setRecommendations(response.data)
      setRecommendationTitle(response.title)
    } catch (error) {
      console.error(error)
      setRecommendations([])
      setRecommendationTitle("")
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const newFolder = await folderService.createFolder(newFolderName)
      setFolders((prevFolders) => [...prevFolders, newFolder])
      setSelectedFolder(newFolder)
      setIsCreating(false)
      setNewFolderName("")
    } catch (error) {
      console.error(error)
    }
  }

  const executeDeleteFolder = async (folderId: string) => {
    try {
      await folderService.deleteFolder(folderId)
      const remainingFolders = folders.filter((folder) => folder.id !== folderId)
      setFolders(remainingFolders)
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(remainingFolders[0] ?? null)
        setBookmarks([])
        setRecommendations([])
        setRecommendationTitle("")
      }
    } catch (error) {
      console.error(error)
    } finally {
      setFolderToDelete(null)
    }
  }

  const handleDeleteFolder = (folderId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setFolderToDelete(folderId)
  }

  const handleRecipeClick = (bookmark: FolderBookmarkEntry) => {
    if (!bookmark.recipe) return
    setLoadingRecipeDetail(false)
    setSelectedRecipe(bookmark.recipe)
    setIsRecipeModalOpen(true)
  }

  const handleRecommendationClick = async (recipeId: string) => {
    setIsRecipeModalOpen(true)
    setLoadingRecipeDetail(true)
    try {
      setSelectedRecipe(await recipeService.getRecipeDetail(recipeId))
    } catch (error) {
      console.error(error)
      setSelectedRecipe(null)
    } finally {
      setLoadingRecipeDetail(false)
    }
  }

  const executeDeleteBookmark = async (bookmarkId: string) => {
    try {
      await bookmarkService.removeBookmark(bookmarkId)
      setBookmarks((prevBookmarks) => prevBookmarks.filter((bookmark) => bookmark.bookmarkId !== bookmarkId))
      if (selectedFolder) {
        void fetchRecommendations(selectedFolder.id)
      }
    } catch (error) {
      console.error(error)
      alert("Failed to remove bookmark")
    } finally {
      setBookmarkToDelete(null)
    }
  }

  const handleDeleteBookmark = (event: React.MouseEvent, bookmarkId: string) => {
    event.stopPropagation()
    setBookmarkToDelete(bookmarkId)
  }

  return (
    <div className="flex h-[calc(100vh-64px)] w-full flex-col bg-zinc-50 md:flex-row">
      <div className="w-full overflow-y-auto border-r border-zinc-200 bg-white p-4 md:w-64 lg:w-80">
        <h2 className="mb-6 mt-8 flex items-center gap-2 text-xl font-bold text-zinc-900">
          <Bookmark className="h-10 w-10 text-zinc-900" />
          My Bookmarks
        </h2>

        <div className="mb-8 space-y-1">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={`group flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 transition-colors ${
                selectedFolder?.id === folder.id ? "bg-zinc-100 text-zinc-900" : "text-zinc-600 hover:bg-zinc-100/50"
              }`}
            >
              <div
                className="flex flex-1 items-center gap-3 overflow-hidden"
                onClick={() => setSelectedFolder(folder)}
              >
                <Folder
                  className={`h-4 w-4 shrink-0 ${
                    selectedFolder?.id === folder.id ? "fill-zinc-300 text-zinc-900" : "text-zinc-400"
                  }`}
                />
                <span className="truncate text-sm font-medium">{folder.name}</span>
              </div>
              <button
                onClick={(event) => handleDeleteFolder(folder.id, event)}
                className="p-1 text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {isCreating ? (
          <div className="flex gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="Folder name"
              onKeyDown={(event) => event.key === "Enter" && void handleCreateFolder()}
            />
            <button
              onClick={() => void handleCreateFolder()}
              className="mx-2 text-sm font-semibold text-zinc-900 transition-colors hover:text-zinc-600"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900"
          >
            <Plus className="h-4 w-4 shrink-0" />
            New Folder
          </button>
        )}
      </div>

      <div className="w-full flex-1 overflow-y-auto p-6 md:p-10">
        {selectedFolder ? (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <h1 className="text-2xl font-black text-zinc-900 md:text-3xl">{selectedFolder.name}</h1>
              <span className="rounded-full bg-zinc-200 px-3 py-1 text-sm font-medium text-zinc-600">
                {bookmarks.length} Recipes
              </span>
            </div>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="h-96 animate-pulse rounded-[2rem] bg-zinc-200" />
                ))}
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 p-12 text-center">
                <div className="mb-4 rounded-full bg-zinc-100 p-4">
                  <Bookmark className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900">No bookmarks yet</h3>
                <p className="mt-2 max-w-sm text-zinc-500">
                  Explore recipes and add them to this folder to build your collection.
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {[...bookmarks].sort((a, b) => b.userRating - a.userRating).map((bookmark, index) => {
                    const imageUrl = getFirstImage(bookmark.recipe?.Images)

                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        key={bookmark.bookmarkId}
                        onClick={() => handleRecipeClick(bookmark)}
                        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white p-2 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                      >
                        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-zinc-100">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={bookmark.recipe?.Name || "Recipe"}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover opacity-0 transition-all duration-700 hover:scale-105"
                              onLoad={handleRecipeImageLoad}
                              onError={handleRecipeImageError}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                              <ImageOff className="h-8 w-8 text-zinc-300" />
                            </div>
                          )}

                          <div className="absolute left-3 top-3 flex w-[calc(100%-24px)] justify-between gap-2">
                            {bookmark.recipe?.RecipeCategory && bookmark.recipe.RecipeCategory !== "n/a" && (
                              <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-800 shadow-sm backdrop-blur-md">
                                {bookmark.recipe.RecipeCategory}
                              </div>
                            )}
                            <div className="ml-auto flex gap-2">
                              <button
                                onClick={(event) => handleDeleteBookmark(event, bookmark.bookmarkId)}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm backdrop-blur-md transition-transform hover:scale-110 hover:bg-red-500 hover:text-white"
                                title="Remove bookmark"
                              >
                                <BookmarkMinus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="flex w-full flex-1 flex-col p-4">
                          <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-tight tracking-tight text-zinc-900 transition-colors group-hover:text-blue-600">
                            {bookmark.recipe?.Name || "Untitled recipe"}
                          </h3>

                          {bookmark.recipe?.RecipeIngredientParts && bookmark.recipe.RecipeIngredientParts !== "n/a" && (
                            <p className="mb-4 flex-1 line-clamp-2 text-sm text-zinc-500">
                              <span className="font-semibold text-zinc-700">Ingredients:</span>{" "}
                              {getIngredients(bookmark.recipe.RecipeIngredientParts).join(", ")}
                            </p>
                          )}

                          <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-3">
                            <div className="flex items-center gap-1">Your rating</div>
                            <div className="flex items-center gap-1">
                              {bookmark.userRating > 0 ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                  <Star
                                    key={index}
                                    className={`h-4 w-4 ${
                                      index < bookmark.userRating ? "fill-yellow-400 text-yellow-400" : "text-zinc-200"
                                    }`}
                                  />
                                ))
                              ) : (
                                <span className="text-xs font-medium text-zinc-400">No rating</span>
                              )}
                            </div>
                            {bookmark.userRating > 0 && (
                              <span className="text-sm font-bold text-zinc-700">{bookmark.userRating.toFixed(1)}</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                <section className="space-y-5">
                  <div className="flex flex-col gap-4 rounded-[2rem] border border-zinc-200/70 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
                    <div className="max-w-3xl">
                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                        <Sparkles className="h-3.5 w-3.5" />
                        Folder Recommendations
                      </div>
                      <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Inspired by this folder</h2>
                      <p className="mt-2 text-zinc-600">
                        Suggestions generated from the recipes already saved in{" "}
                        <span className="font-semibold text-zinc-800">{selectedFolder.name}</span>.
                      </p>
                    </div>

                    {recommendationTitle && (
                      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                        {recommendationTitle}
                      </div>
                    )}
                  </div>

                  {loadingRecommendations ? (
                    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="h-80 animate-pulse rounded-[2rem] bg-zinc-200" />
                      ))}
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-zinc-50/70 p-10 text-center text-zinc-500">
                      Add more recipes to this folder and we will shape stronger recommendations around it.
                    </div>
                  ) : (
                    <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {recommendations.map((recipe, index) => (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.05 }}
                          key={`recommend-${recipe.id}`}
                          onClick={() => void handleRecommendationClick(recipe.id)}
                          className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white p-2 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-zinc-100">
                            {recipe.image ? (
                              <img
                                src={recipe.image}
                                alt={recipe.name || "Recommended recipe"}
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover opacity-0 transition-all duration-700 hover:scale-105"
                                onLoad={handleRecipeImageLoad}
                                onError={handleRecipeImageError}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-zinc-100">
                                <ImageOff className="h-8 w-8 text-zinc-300" />
                              </div>
                            )}

                            <div className="absolute left-3 top-3 flex w-[calc(100%-24px)] justify-between gap-2">
                              {recipe.category && recipe.category !== "n/a" && (
                                <div className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-800 shadow-sm backdrop-blur-md">
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

                          <div className="flex flex-1 flex-col p-4">
                            <h3 className="line-clamp-2 text-lg font-bold leading-tight tracking-tight text-zinc-900 transition-colors group-hover:text-blue-600">
                              {recipe.name}
                            </h3>
                            <div className="mt-auto flex items-center justify-between pt-4 text-zinc-500">
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <Clock className="h-4 w-4" />
                                {recipe.total_time ? `${recipe.total_time} min` : "N/A"}
                              </div>
                              <div className="flex items-center gap-1.5 text-sm font-medium">
                                <Flame className="h-4 w-4 text-orange-500" />
                                {recipe.calories ? `${Math.round(recipe.calories)} cal` : "N/A"}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-zinc-500">Select a folder or create a new one to view bookmarks.</div>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        <LazyRecipeModal
          isOpen={isRecipeModalOpen}
          onClose={() => setIsRecipeModalOpen(false)}
          onBookmarkRemoved={() => {
            if (selectedFolder) {
              void fetchBookmarks(selectedFolder.id)
              void fetchRecommendations(selectedFolder.id)
            }
            setIsRecipeModalOpen(false)
          }}
          recipe={selectedRecipe}
          loading={loadingRecipeDetail}
        />
      </Suspense>

      <ConfirmModal
        isOpen={!!folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirm={() => {
          if (folderToDelete) void executeDeleteFolder(folderToDelete)
        }}
        title="Delete Folder?"
        message="Are you sure you want to delete this folder? All bookmarks inside will be permanently removed."
        confirmText="Delete Folder"
      />

      <ConfirmModal
        isOpen={!!bookmarkToDelete}
        onClose={() => setBookmarkToDelete(null)}
        onConfirm={() => {
          if (bookmarkToDelete) void executeDeleteBookmark(bookmarkToDelete)
        }}
        title="Remove Bookmark?"
        message="Are you sure you want to remove this bookmark from your folder?"
        confirmText="Remove Bookmark"
      />
    </div>
  )
}
