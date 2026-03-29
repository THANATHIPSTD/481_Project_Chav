import api from "./api"

export interface Folder {
  id: string;
  name: string;
  user_id: string;
  created_at?: string;
}

export interface Bookmark {
  id: string;
  recipe_id: string;
  folder_id: string;
  rating: number;
  created_at?: string;
}

export const folderService = {
  getFolders: async (): Promise<Folder[]> => {
    const response = await api.get("/folders")
    return response.data
  },
  createFolder: async (name: string): Promise<Folder> => {
    const response = await api.post("/folders", { name })
    return response.data.folder ?? response.data
  },
  deleteFolder: async (folderId: string): Promise<void> => {
    await api.delete(`/folders/${folderId}`)
  },
  getFolderBookmarks: async (folderId: string): Promise<Bookmark[]> => {
    const response = await api.get(`/folders/${folderId}/bookmarks`)
    return response.data
  }
}

export const bookmarkService = {
  addBookmark: async (recipeId: string, folderId: string, rating: number): Promise<Bookmark> => {
    const response = await api.post("/bookmarks", { recipe_id: recipeId, folder_id: folderId, rating })
    return response.data
  },
  getBookmarks: async (): Promise<Bookmark[]> => {
    const response = await api.get("/bookmarks")
    return response.data
  }
}
