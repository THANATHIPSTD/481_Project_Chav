import { beforeEach, describe, expect, it, vi } from "vitest"

import { bookmarkService } from "@/services/bookmarkService"
import api from "@/services/api"

vi.mock("@/services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

describe("bookmarkService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates bookmarks with the API payload expected by the backend", async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { bookmarkId: 9 },
    })

    await expect(bookmarkService.createBookmark("101", "2", 4)).resolves.toEqual({ bookmarkId: "9" })
    expect(api.post).toHaveBeenCalledWith("/bookmarks", {
      recipeId: "101",
      folderId: "2",
      rating: 4,
    })
  })

  it("normalizes bookmark status responses", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        is_bookmarked: true,
        bookmark_id: 9,
        folder_id: 2,
        rating: 5,
      },
    })

    await expect(bookmarkService.checkBookmarkStatus("101")).resolves.toEqual({
      isBookmarked: true,
      bookmarkId: "9",
      folderId: "2",
      rating: 5,
    })
    expect(api.get).toHaveBeenCalledWith("/bookmarks/check/101")
  })

  it("removes bookmarks and can load bookmark collections", async () => {
    vi.mocked(api.delete).mockResolvedValue({})
    vi.mocked(api.get).mockResolvedValue({
      data: [{ bookmark_id: 9 }],
    })

    await expect(bookmarkService.removeBookmark("9")).resolves.toBeUndefined()
    await expect(bookmarkService.getBookmarks()).resolves.toEqual([{ bookmark_id: 9 }])

    expect(api.delete).toHaveBeenCalledWith("/bookmarks/9")
    expect(api.get).toHaveBeenCalledWith("/bookmarks")
  })
})
