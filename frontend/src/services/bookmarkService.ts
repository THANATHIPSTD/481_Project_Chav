import api from "@/services/api"

export interface BookmarkStatus {
  isBookmarked: boolean
  bookmarkId?: string
  folderId?: string
  rating?: number
}

export interface CreatedBookmark {
  bookmarkId: string
}

interface RawBookmarkStatus {
  is_bookmarked?: boolean
  bookmark_id?: string | number
  folder_id?: string | number
  rating?: number
}

function normalizeBookmarkStatus(status: RawBookmarkStatus): BookmarkStatus {
  return {
    isBookmarked: Boolean(status.is_bookmarked),
    bookmarkId: status.bookmark_id != null ? String(status.bookmark_id) : undefined,
    folderId: status.folder_id != null ? String(status.folder_id) : undefined,
    rating: status.rating != null ? Number(status.rating) : undefined,
  }
}

async function createBookmark(recipeId: string, folderId: string, rating: number): Promise<CreatedBookmark> {
  const response = await api.post<{ bookmarkId?: string | number; bookmark_id?: string | number }>("/bookmarks", {
    recipeId,
    folderId,
    rating,
  })

  return {
    bookmarkId: String(response.data.bookmarkId ?? response.data.bookmark_id ?? ""),
  }
}

async function removeBookmark(bookmarkId: string): Promise<void> {
  await api.delete(`/bookmarks/${bookmarkId}`)
}

async function checkBookmarkStatus(recipeId: string): Promise<BookmarkStatus> {
  const response = await api.get<RawBookmarkStatus>(`/bookmarks/check/${recipeId}`)
  return normalizeBookmarkStatus(response.data)
}

async function getBookmarks() {
  const response = await api.get("/bookmarks")
  return response.data
}

export const bookmarkService = {
  createBookmark,
  removeBookmark,
  checkBookmarkStatus,
  getBookmarks,
}
