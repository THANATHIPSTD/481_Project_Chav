import unittest
from unittest.mock import Mock

from Backend.tests.helpers import QueryStub, build_fake_models_module, import_fresh


fake_models, fake_db, FakeUser, FakeFolder, FakeBookmark = build_fake_models_module()
bookmark_service = import_fresh("Backend.services.bookmark_service")


class BookmarkServiceUnitTests(unittest.TestCase):
    def setUp(self):
        bookmark_service.db.session = Mock()
        FakeFolder.query = QueryStub()
        FakeBookmark.query = QueryStub()

    def test_add_bookmark_raises_when_folder_is_missing(self):
        FakeFolder.query = QueryStub(first_result=None)

        with self.assertRaisesRegex(ValueError, "Folder not found"):
            bookmark_service.add_bookmark(user_id=3, recipe_id=99, folder_id=8, rating=4)

    def test_add_bookmark_raises_for_invalid_rating(self):
        FakeFolder.query = QueryStub(first_result=FakeFolder(user_id=3, name="Dinner", id=8))

        with self.assertRaisesRegex(ValueError, "between 1 and 5"):
            bookmark_service.add_bookmark(user_id=3, recipe_id=99, folder_id=8, rating=6)

    def test_add_bookmark_raises_when_recipe_is_already_bookmarked(self):
        FakeFolder.query = QueryStub(first_result=FakeFolder(user_id=3, name="Dinner", id=8))
        FakeBookmark.query = QueryStub(first_result=FakeBookmark(id=55))

        with self.assertRaisesRegex(ValueError, "already bookmarked"):
            bookmark_service.add_bookmark(user_id=3, recipe_id=99, folder_id=8, rating=5)

    def test_add_bookmark_persists_new_bookmark(self):
        FakeFolder.query = QueryStub(first_result=FakeFolder(user_id=3, name="Dinner", id=8))
        FakeBookmark.query = QueryStub(first_result=None)

        def assign_id(bookmark):
            bookmark.id = 77

        bookmark_service.db.session.add.side_effect = assign_id

        bookmark = bookmark_service.add_bookmark(user_id=3, recipe_id=99, folder_id=8, rating=4)

        self.assertEqual(bookmark.id, 77)
        self.assertEqual(bookmark.recipe_id, 99)
        self.assertEqual(bookmark.folder_id, 8)
        bookmark_service.db.session.commit.assert_called_once()

    def test_get_all_user_bookmarks_serializes_bookmarks(self):
        bookmark = FakeBookmark(user_id=3, folder_id=8, recipe_id=99, rating=4, id=77)
        bookmark.folder = FakeFolder(user_id=3, name="Dinner", id=8)
        FakeBookmark.query = QueryStub(all_result=[bookmark])

        result = bookmark_service.get_all_user_bookmarks(user_id=3)

        self.assertEqual(
            result,
            [
                {
                    "bookmark_id": 77,
                    "folder_id": 8,
                    "folder_name": "Dinner",
                    "recipe_id": 99,
                    "rating": 4,
                    "created_at": bookmark.created_at,
                }
            ],
        )

    def test_check_user_bookmark_returns_false_when_missing(self):
        FakeBookmark.query = QueryStub(first_result=None)

        result = bookmark_service.check_user_bookmark(user_id=3, recipe_id=99)

        self.assertEqual(result, {"is_bookmarked": False})

    def test_check_user_bookmark_returns_metadata_when_found(self):
        bookmark = FakeBookmark(user_id=3, folder_id=8, recipe_id=99, rating=4, id=77)
        FakeBookmark.query = QueryStub(first_result=bookmark)

        result = bookmark_service.check_user_bookmark(user_id=3, recipe_id=99)

        self.assertEqual(
            result,
            {
                "is_bookmarked": True,
                "bookmark_id": 77,
                "folder_id": 8,
                "rating": 4,
            },
        )

    def test_update_bookmark_raises_when_missing(self):
        FakeBookmark.query = QueryStub(first_result=None)

        with self.assertRaisesRegex(ValueError, "Bookmark not found"):
            bookmark_service.update_bookmark(user_id=3, bookmark_id=77, new_folder_id=8, new_rating=5)

    def test_update_bookmark_validates_new_folder(self):
        bookmark = FakeBookmark(user_id=3, folder_id=8, recipe_id=99, rating=4, id=77)
        FakeBookmark.query = QueryStub(first_result=bookmark)
        FakeFolder.query = QueryStub(first_result=None)

        with self.assertRaisesRegex(ValueError, "New folder not found"):
            bookmark_service.update_bookmark(user_id=3, bookmark_id=77, new_folder_id=9, new_rating=5)

    def test_update_bookmark_updates_folder_and_rating(self):
        bookmark = FakeBookmark(user_id=3, folder_id=8, recipe_id=99, rating=4, id=77)
        FakeBookmark.query = QueryStub(first_result=bookmark)
        FakeFolder.query = QueryStub(first_result=FakeFolder(user_id=3, name="Dessert", id=9))

        updated = bookmark_service.update_bookmark(user_id=3, bookmark_id=77, new_folder_id=9, new_rating=5)

        self.assertIs(updated, bookmark)
        self.assertEqual(bookmark.folder_id, 9)
        self.assertEqual(bookmark.rating, 5)
        bookmark_service.db.session.commit.assert_called_once()

    def test_delete_bookmark_removes_entry(self):
        bookmark = FakeBookmark(user_id=3, folder_id=8, recipe_id=99, rating=4, id=77)
        FakeBookmark.query = QueryStub(first_result=bookmark)

        result = bookmark_service.delete_bookmark(user_id=3, bookmark_id=77)

        self.assertTrue(result)
        bookmark_service.db.session.delete.assert_called_once_with(bookmark)
        bookmark_service.db.session.commit.assert_called_once()


if __name__ == "__main__":
    unittest.main()

