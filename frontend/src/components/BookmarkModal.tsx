/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Star } from "lucide-react"
import { getFolders, createFolder, createBookmark } from "../services/api"

interface BookmarkModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: () => void
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

  useEffect(() => {
    if (isOpen) {
      fetchFolders()
      setRating(0)
      setSelectedFolder("")
      setIsCreatingFolder(false)
      setNewFolderName("")
    }
  }, [isOpen])

  const fetchFolders = async () => {
    try {
      const res = await getFolders()
      setFolders(res.data)
      if (res.data.length > 0) {
        setSelectedFolder(res.data[0].id)
      }
    } catch (e) {
      console.error("Failed to fetch folders", e)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      const res = await createFolder(newFolderName)
      setFolders([...folders, res.data])
      setSelectedFolder(res.data.id)
      setIsCreatingFolder(false)
      setNewFolderName("")
    } catch (e) {
      console.error("Failed to create folder", e)
    }
  }

  const handleSave = async () => {
    if (!selectedFolder) {
        alert("Please select a folder")
        return
    }
    setLoading(true)
    try {
      await createBookmark(recipeId, selectedFolder, rating)
      if (onSaved) onSaved()
      onClose()
    } catch (e) {
      console.error("Failed to create bookmark", e)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-xl font-bold text-zinc-800">Bookmark Recipe</h2>
            <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <p className="font-medium text-zinc-700">Save "<span className="text-zinc-900 font-bold">{recipeName}</span>"</p>

            {/* Folder Selection */}
            <div>
              <label className="text-sm font-semibold text-zinc-700 mb-2 block">Choose Folder</label>
              {folders.length === 0 && !isCreatingFolder ? (
                <p className="text-sm text-zinc-500 mb-2">No folders found. Create one first!</p>
              ) : (
                !isCreatingFolder && (
                  <select
                    value={selectedFolder}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  >
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                )
              )}

              {isCreatingFolder ? (
                <div className="flex gap-2 mt-2">
                  <input
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Folder name"
                    className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                  />
                  <button onClick={handleCreateFolder} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
                    Add
                  </button>
                  <button onClick={() => setIsCreatingFolder(false)} className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingFolder(true)}
                  className="mt-3 flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-4 w-4" /> Create New Folder
                </button>
              )}
            </div>

            {/* Rating Selection */}
            <div>
              <label className="text-sm font-semibold text-zinc-700 mb-2 flex justify-between">
                <span>Rate this recipe (Optional)</span>
                {rating > 0 && <span className="text-yellow-600 font-bold">{rating} Stars</span>}
              </label>
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
          </div>

          <div className="flex justify-end gap-3 border-t bg-zinc-50 px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !selectedFolder}
              className="rounded-xl bg-zinc-900 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Bookmark"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}