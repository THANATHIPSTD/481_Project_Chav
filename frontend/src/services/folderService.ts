import api from "@/services/api"
import { normalizeRecipeDetail, normalizeRecipePreview } from "@/services/recipeService"
import type { RecipeDetail, RecipePreview } from "@/types/recipe"

export interface Folder {
  id: string
  name: string
  description?: string | null
  createdAt?: string
}

export interface FolderBookmarkEntry {
  bookmarkId: string
  userRating: number
  savedAt?: string
  recipe: RecipeDetail | null
}

export interface FolderRecommendationsResponse {
  title: string
  data: RecipePreview[]
}

interface RawFolder {
  id?: string | number
  name?: string
  description?: string | null
  created_at?: string
}

interface RawFolderBookmarkEntry {
  bookmark_id?: string | number
  user_rating?: number
  saved_at?: string
  recipe?: Partial<RecipeDetail> & { id?: string | number }
}

interface RawFolderRecommendationsResponse {
  title?: string
  data?: Array<Record<string, unknown>>
}

function normalizeFolder(folder: RawFolder): Folder {
  return {
    id: String(folder.id ?? ""),
    name: folder.name ?? "Untitled folder",
    description: folder.description ?? null,
    createdAt: folder.created_at,
  }
}

function normalizeFolderBookmark(entry: RawFolderBookmarkEntry): FolderBookmarkEntry {
  return {
    bookmarkId: String(entry.bookmark_id ?? ""),
    userRating: Number(entry.user_rating ?? 0),
    savedAt: entry.saved_at,
    recipe: entry.recipe ? normalizeRecipeDetail(entry.recipe) : null,
  }
}

async function getFolders(): Promise<Folder[]> {
  const response = await api.get<RawFolder[]>("/folders")
  return response.data.map(normalizeFolder)
}

async function createFolder(name: string): Promise<Folder> {
  const response = await api.post<{ folder?: RawFolder } & RawFolder>("/folders", { name })
  return normalizeFolder(response.data.folder ?? response.data)
}

async function deleteFolder(folderId: string): Promise<void> {
  await api.delete(`/folders/${folderId}`)
}

async function getFolderBookmarks(folderId: string): Promise<FolderBookmarkEntry[]> {
  const response = await api.get<RawFolderBookmarkEntry[]>(`/folders/${folderId}/bookmarks`)
  return response.data.map(normalizeFolderBookmark)
}

async function getFolderRecommendations(folderId: string): Promise<FolderRecommendationsResponse> {
  const response = await api.get<RawFolderRecommendationsResponse>(`/folders/${folderId}/recommendations`)
  return {
    title: response.data.title ?? "",
    data: (response.data.data ?? []).map((recipe) => normalizeRecipePreview(recipe)),
  }
}

export const folderService = {
  getFolders,
  createFolder,
  deleteFolder,
  getFolderBookmarks,
  getFolderRecommendations,
}
