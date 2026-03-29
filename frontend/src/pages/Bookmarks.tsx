/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Folder, Bookmark, Trash2, Plus, Star, ImageOff, BookmarkMinus } from "lucide-react"
import { getFolders, createFolder, deleteFolder, getFolderBookmarks, removeBookmark } from "../services/api"
import { RecipeModal } from "../components/RecipeModal"
import { ConfirmModal } from "../components/ConfirmModal"
import type { RecipeDetail } from "../components/RecipeModal"

const getFirstImage = (images: any) => {
  if (!images || images === "n/a" || images === "nan") return null
  if (typeof images === "string") {
    // Split by comma+space to not break internal URL commas
    const cleaned = images.replace(/c\("/g, '').replace(/"\)/g, '')
    const urlArray = cleaned.split(", ").map(u => u.trim().replace(/['"]/g, ''))
    const validUrls = urlArray.filter(url => url.startsWith("http"))
    return validUrls.length > 0 ? validUrls[0] : null
  }
  if (Array.isArray(images) && images.length > 0) return images[0]
  return null
}

const getIngredients = (ing: any) => {
  if (!ing || ing === "n/a" || ing === "nan") return []
  if (typeof ing === "string") {
    return ing.replace(/c\("/g, '').replace(/"\)/g, '')
              .split(',')
              .map((item: string) => item.replace(/['"]/g, '').trim())
              .filter((item: string) => item.length > 0)
  }
  return []
}

export default function Bookmarks() {
  const [folders, setFolders] = useState<any[]>([])
  const [selectedFolder, setSelectedFolder] = useState<any>(null)
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  
  // Recipe Modal states
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeDetail | null>(null)
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false)

  // Confirmation Models states
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null)
  const [bookmarkToDelete, setBookmarkToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchFolders()
  }, [])

  useEffect(() => {
    if (selectedFolder) {
      fetchBookmarks(selectedFolder.id)
    }
  }, [selectedFolder])

  const fetchFolders = async () => {
    try {
      const res = await getFolders()
      setFolders(res.data)
      if (res.data.length > 0 && !selectedFolder) {
        setSelectedFolder(res.data[0])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchBookmarks = async (folderId: string) => {
    setLoading(true)
    try {
      const res = await getFolderBookmarks(folderId)
      setBookmarks(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const res = await createFolder(newFolderName)
      setFolders([...folders, res.data])
      setSelectedFolder(res.data)
      setIsCreating(false)
      setNewFolderName("")
    } catch (e) {
      console.error(e)
    }
  }

  const executeDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder(folderId)
      setFolders(folders.filter(f => f.id !== folderId))
      if (selectedFolder?.id === folderId) {
        setSelectedFolder(folders.length > 1 ? folders[0] : null)
        setBookmarks([])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFolderToDelete(folderId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRecipeClick = (bmark: any) => {
    if (!bmark.recipe) return;
    const mappedRecipe = {
      id: bmark.recipe.RecipeId?.toString() || bmark.recipe.id?.toString(),
      ...bmark.recipe
    } as RecipeDetail

    setSelectedRecipe(mappedRecipe)
    setIsRecipeModalOpen(true)
  }

  const executeDeleteBookmark = async (bookmarkId: string) => {
    try {
      await removeBookmark(bookmarkId);
      setBookmarks(bookmarks.filter(b => b.bookmark_id !== bookmarkId && b.id !== bookmarkId));
    } catch (err) {
      console.error(err);
      alert('Failed to remove bookmark');
    }
  }

  const handleDeleteBookmark = (e: React.MouseEvent, bookmarkId: string) => {
    e.stopPropagation();
    setBookmarkToDelete(bookmarkId);
  }

  return (
    <div className="flex h-[calc(100vh-64px)] w-full flex-col md:flex-row bg-zinc-50">
      
      {/* Sidebar - Folders */}
      <div className="w-full md:w-64 lg:w-80 border-r border-zinc-200 bg-white p-4 overflow-y-auto">
        <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2 mt-8">
          <Bookmark className="h-10 w-10 text-zinc-900" />
          My Bookmarks
        </h2>

        <div className="space-y-1 mb-8">
          {folders.map(folder => (
            <div 
              key={folder.id} 
              className={`group flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer transition-colors ${
                selectedFolder?.id === folder.id ? 'bg-zinc-100 text-zinc-900' : 'hover:bg-zinc-100/50 text-zinc-600'
              }`}
            >
              <div 
                className="flex items-center gap-3 flex-1 overflow-hidden"
                onClick={() => setSelectedFolder(folder)}
              >
                <Folder className={`h-4 w-4 shrink-0 ${selectedFolder?.id === folder.id ? 'fill-zinc-300 text-zinc-900' : 'text-zinc-400'}`} />
                <span className="text-sm font-medium truncate">{folder.name}</span>
              </div>
              <button 
                onClick={(e) => handleDeleteFolder(folder.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {isCreating ? (
          <div className="flex gap-2 p-2 border border-zinc-200 rounded-xl bg-zinc-50">
            <input 
              autoFocus
              className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none" 
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()}
            />
            <button onClick={handleCreateFolder} className="text-sm font-semibold text-zinc-900 mx-2 hover:text-zinc-600 transition-colors">Add</button>
          </div>
        ) : (
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 w-full px-3 py-2"
          >
            <Plus className="h-4 w-4 shrink-0" />
            New Folder
          </button>
        )}
      </div>

      {/* Main Content - Bookmarks */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto w-full">
        {selectedFolder ? (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl md:text-3xl font-black text-zinc-900">{selectedFolder.name}</h1>
              <span className="text-sm rounded-full bg-zinc-200 px-3 py-1 text-zinc-600 font-medium">{bookmarks.length} Recipes</span>
            </div>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {[1,2,3,4,5].map(n => (
                  <div key={n} className="h-96 rounded-[2rem] bg-zinc-200 animate-pulse" />
                ))}
              </div>
            ) : bookmarks.length === 0 ? (
               <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50/50">
                 <div className="rounded-full bg-zinc-100 p-4 mb-4">
                   <Bookmark className="h-8 w-8 text-zinc-400" />
                 </div>
                 <h3 className="text-lg font-bold text-zinc-900">No bookmarks yet</h3>
                 <p className="text-zinc-500 max-w-sm mt-2">Explore recipes and add them to this folder to build your collection.</p>
               </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {[...bookmarks].sort((a, b) => b.user_rating - a.user_rating).map((bmark, i) => {
                  const imageUrl = getFirstImage(bmark.recipe?.Images) || getFirstImage(bmark.recipe_images);
                  return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    key={bmark.id}
                    onClick={() => handleRecipeClick(bmark)}
                    className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white p-2 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
                  >
                    {/* Image */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.5rem] bg-zinc-100">
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt={bmark.recipe?.Name || bmark.recipe_name || "Recipe"}
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
                        {bmark.recipe?.RecipeCategory && bmark.recipe.RecipeCategory !== "n/a" && (
                          <div className="rounded-full bg-white/90 px-3 py-1 font-semibold text-xs text-zinc-800 shadow-sm backdrop-blur-md">
                            {bmark.recipe.RecipeCategory}
                          </div>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <button 
                                onClick={(e) => handleDeleteBookmark(e, bmark.bookmark_id || bmark.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm backdrop-blur-md transition-transform hover:scale-110 hover:bg-red-500 hover:text-white"
                                title="Remove bookmark"
                            >
                                <BookmarkMinus className="h-3 w-3" />
                            </button>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col p-4 w-full">
                      <h3 className="line-clamp-2 text-lg font-bold leading-tight tracking-tight text-zinc-900 transition-colors group-hover:text-blue-600 mb-2">
                        {bmark.recipe?.Name || bmark.recipe_name || `Recipe #${bmark.recipe_id}`}
                      </h3>
                      
                      {bmark.recipe?.RecipeIngredientParts && bmark.recipe.RecipeIngredientParts !== "n/a" && (
                        <p className="line-clamp-2 text-sm text-zinc-500 mb-4 flex-1">
                          <span className="font-semibold text-zinc-700">Ingredients:</span> {getIngredients(bmark.recipe.RecipeIngredientParts).join(", ")}
                        </p>
                      )}

                      <div className="mt-auto pt-3 border-t border-zinc-100 flex items-center justify-between">
                        <div className="flex items-center gap-1">Your rating</div>
                        <div className="flex items-center gap-1">
                          {bmark.user_rating > 0 ? (
                            Array.from({ length: 5 }).map((_, idx) => (
                              <Star 
                                key={idx} 
                                className={`h-4 w-4 ${idx < bmark.user_rating ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-200'}`} 
                              />
                            ))
                          ) : (
                            <span className="text-xs text-zinc-400 font-medium">No rating</span>
                          )}
                        </div>
                        {bmark.user_rating > 0 && (
                          <span className="text-sm font-bold text-zinc-700">{parseFloat(bmark.user_rating).toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )})}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-zinc-500">Select a folder or create a new one to view bookmarks.</div>
          </div>
        )}
      </div>

      <RecipeModal 
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        onBookmarkRemoved={() => {
            if (selectedFolder) fetchBookmarks(selectedFolder.id);
            setIsRecipeModalOpen(false);
        }}
        recipe={selectedRecipe}
        loading={false}
      />

      <ConfirmModal
        isOpen={!!folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirm={() => {
          if (folderToDelete) executeDeleteFolder(folderToDelete);
        }}
        title="Delete Folder?"
        message="Are you sure you want to delete this folder? All bookmarks inside will be permanently removed."
        confirmText="Delete Folder"
      />

      <ConfirmModal
        isOpen={!!bookmarkToDelete}
        onClose={() => setBookmarkToDelete(null)}
        onConfirm={() => {
          if (bookmarkToDelete) executeDeleteBookmark(bookmarkToDelete);
        }}
        title="Remove Bookmark?"
        message="Are you sure you want to remove this bookmark from your folder?"
        confirmText="Remove Bookmark"
      />
    </div>
  )
}