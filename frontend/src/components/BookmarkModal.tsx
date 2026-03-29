/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Check, Plus, Star } from "lucide-react"
import { getFolders, createFolder, createBookmark } from "../services/api"

interface BookmarkModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (bookmarkId: string) => void
  recipeId: string
  recipeName: string
}

export function BookmarkModal({ isOpen, onClose, onSaved, recipeId, recipeName }: BookmarkModalProps) {
  const [folders, setFolders] = useState<any[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>("")
  const [rating, setRating] = useState<number>(0)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [loading, setLoading] = useState(false)
  const [isLoadingFolders, setIsLoadingFolders] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (isOpen) {
      fetchFolders()
      setRating(0)
      setSelectedFolder("")
      setIsCreatingFolder(false)
      setNewFolderName("")
      setErrorMessage("")
    }
  }, [isOpen])

  const fetchFolders = async () => {
    setIsLoadingFolders(true)
    try {
      const res = await getFolders()
      setFolders(res.data)
      if (res.data.length > 0) {
        setSelectedFolder(String(res.data[0].id))
      }
      setErrorMessage("")
    } catch (e) {
      console.error("Failed to fetch folders", e)
      setErrorMessage("Couldn't load folders right now.")
    } finally {
      setIsLoadingFolders(false)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const res = await createFolder(newFolderName)
      setFolders((prevFolders) => [...prevFolders, res.data])
      setSelectedFolder(String(res.data.id))
      setIsCreatingFolder(false)
      setNewFolderName("")
      setErrorMessage("")
    } catch (e) {
      console.error("Failed to create folder", e)
      setErrorMessage("Couldn't create that folder. Try a different name.")
    }
  }

  const handleSave = async () => {
    if (!selectedFolder) {
      setErrorMessage("Please choose a folder before saving.")
      return
    }
    setLoading(true)
    try {
      const effectiveRating = rating > 0 ? rating : 5
      const response = await createBookmark(recipeId, selectedFolder, effectiveRating)
      if (onSaved) onSaved(String(response.data.bookmarkId))
      setErrorMessage("")
      onClose()
    } catch (e) {
      console.error("Failed to create bookmark", e)
      setErrorMessage("Couldn't save this bookmark right now.")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: 12, height: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <motion.div
          layout
          className="mt-4 rounded-[1.75rem] border border-zinc-200/80 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900">Save to a folder</h3>
              <p className="mt-1 text-sm text-zinc-500">
                <span className="font-semibold text-zinc-700">{recipeName}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full px-3 py-1 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            >
              Close
            </button>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700">Choose Folder</label>

              {isLoadingFolders ? (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-10 w-24 animate-pulse rounded-2xl bg-zinc-100" />
                  ))}
                </div>
              ) : folders.length === 0 && !isCreatingFolder ? (
                <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
                  No folders yet. Create one to save this recipe.
                </p>
              ) : (
                !isCreatingFolder && (
                  <div className="flex flex-wrap gap-2">
                    {folders.map((folder) => {
                      const isSelected = selectedFolder === String(folder.id)

                      return (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => setSelectedFolder(String(folder.id))}
                          className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                            isSelected
                              ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                              : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100"
                          }`}
                        >
                          {isSelected && <Check className="h-4 w-4" />}
                          {folder.name}
                        </button>
                      )
                    })}
                  </div>
                )
              )}

              {isCreatingFolder ? (
                <div className="mt-3 space-y-2">
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name"
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm focus:border-zinc-500 focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateFolder}
                      className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
                    >
                      Add Folder
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingFolder(false)
                        setNewFolderName("")
                      }}
                      className="rounded-2xl px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <Plus className="h-4 w-4" /> Create New Folder
                </button>
              )}
            </div>

            <div>
              <label className="mb-2 flex justify-between text-sm font-semibold text-zinc-700">
                <span>Rate this recipe</span>
                {rating > 0 && <span className="text-yellow-600 font-bold">{rating} Stars</span>}
              </label>
              <p className="mb-3 text-xs text-zinc-500">If you skip this, we will save it with a default 5-star rating.</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div key={star} className="relative w-8 h-8 transition-transform hover:scale-110">
                    {/* Background empty star */}
                    <Star className="absolute inset-0 h-8 w-8 text-zinc-300" />
                    
                    {/* Filled foreground star (clipped depending on rating) */}
                    <div 
                      className="absolute inset-0 overflow-hidden"
                      style={{ width: rating >= star ? '100%' : rating >= star - 0.5 ? '50%' : '0%' }}
                    >
                      <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
                    </div>

                    {/* Click targets */}
                    <div className="absolute inset-0 flex">
                      <div 
                        className="h-full w-1/2 cursor-pointer" 
                        onClick={() => setRating(rating === star - 0.5 ? 0 : star - 0.5)}
                      />
                      <div 
                        className="h-full w-1/2 cursor-pointer" 
                        onClick={() => setRating(rating === star ? 0 : star)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-zinc-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || !selectedFolder}
                className="rounded-2xl bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Bookmark"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
