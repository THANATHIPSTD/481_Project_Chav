import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE ?? "/api",
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Folder API Endpoints
export const getFolders = () => api.get("/folders")
export const createFolder = (name: string) => api.post("/folders", { name })
export const deleteFolder = (id: string) => api.delete(`/folders/${id}`)
export const getFolderBookmarks = (id: string) => api.get(`/folders/${id}/bookmarks`)

// Bookmark API Endpoints
export const getBookmarks = () => api.get("/bookmarks")
export const checkBookmarkStatus = (recipeId: string) => api.get(`/bookmarks/check/${recipeId}`)
export const createBookmark = (recipeId: string, folderId: string, rating: number) =>
  api.post("/bookmarks", { recipeId, folderId, rating })
export const removeBookmark = (bookmarkId: string) => api.delete(`/bookmarks/${bookmarkId}`)

export default api