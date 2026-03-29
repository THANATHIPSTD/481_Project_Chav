import sys
import types
import unittest
from unittest.mock import Mock

from Backend.tests.helpers import import_fresh, install_fake_jwt_module, make_test_app


jwt_module = install_fake_jwt_module()

fake_bookmark_service = types.ModuleType("Backend.services.bookmark_service")
fake_bookmark_service.add_bookmark = lambda *args, **kwargs: None
fake_bookmark_service.get_all_user_bookmarks = lambda *args, **kwargs: []
fake_bookmark_service.update_bookmark = lambda *args, **kwargs: None
fake_bookmark_service.delete_bookmark = lambda *args, **kwargs: None
fake_bookmark_service.check_user_bookmark = lambda *args, **kwargs: {"is_bookmarked": False}
sys.modules["Backend.services.bookmark_service"] = fake_bookmark_service

fake_es_service = types.ModuleType("Backend.services.es_service")
fake_es_service.get_recipe_by_id = lambda recipe_id: {"id": recipe_id}
sys.modules["Backend.services.es_service"] = fake_es_service

bookmark_routes = import_fresh("Backend.routes.bookmark_routes")
app = make_test_app()


class BookmarkRoutesUnitTests(unittest.TestCase):
    def setUp(self):
        jwt_module.set_identity(5)

    def test_check_bookmark_rejects_invalid_recipe_id(self):
        with app.test_request_context("/api/bookmarks/check/not-a-number", method="GET"):
            response, status = bookmark_routes.check_bookmark("not-a-number")

        self.assertEqual(status, 400)
        self.assertEqual(response.get_json(), {"error": "Invalid recipe id"})

    def test_get_bookmarks_enriches_results_and_skips_recipe_errors(self):
        bookmark_routes.get_all_user_bookmarks = Mock(
            return_value=[
                {"bookmark_id": 1, "recipe_id": 101, "rating": 5, "folder_id": 8, "folder_name": "Dinner"},
                {"bookmark_id": 2, "recipe_id": 202, "rating": 4, "folder_id": 8, "folder_name": "Dinner"},
            ]
        )

        def get_recipe_side_effect(recipe_id):
            if recipe_id == 202:
                raise RuntimeError("ES unavailable")
            return {"id": recipe_id, "name": "Recipe"}

        bookmark_routes.get_recipe_by_id = Mock(side_effect=get_recipe_side_effect)

        with app.test_request_context("/api/bookmarks", method="GET"):
            response, status = bookmark_routes.get_bookmarks()

        self.assertEqual(status, 200)
        self.assertEqual(
            response.get_json(),
            [
                {
                    "bookmark_id": 1,
                    "recipe_id": 101,
                    "rating": 5,
                    "folder_id": 8,
                    "folder_name": "Dinner",
                    "recipe": {"id": 101, "name": "Recipe"},
                }
            ],
        )

    def test_create_bookmark_returns_created_response(self):
        bookmark_routes.add_bookmark = Mock(return_value=types.SimpleNamespace(id=88))

        with app.test_request_context(
            "/api/bookmarks",
            method="POST",
            json={"recipeId": 101, "folderId": 8, "rating": 5},
        ):
            response, status = bookmark_routes.create_bookmark()

        self.assertEqual(status, 201)
        self.assertEqual(response.get_json(), {"message": "Bookmark added", "bookmarkId": 88})
        bookmark_routes.add_bookmark.assert_called_once_with(5, 101, 8, 5)

    def test_patch_bookmark_maps_value_errors_to_400(self):
        bookmark_routes.update_bookmark = Mock(side_effect=ValueError("Bookmark not found"))

        with app.test_request_context(
            "/api/bookmarks/77",
            method="PATCH",
            json={"folderId": 8, "rating": 5},
        ):
            response, status = bookmark_routes.patch_bookmark(77)

        self.assertEqual(status, 400)
        self.assertEqual(response.get_json(), {"error": "Bookmark not found"})

    def test_remove_bookmark_maps_value_errors_to_404(self):
        bookmark_routes.delete_bookmark = Mock(side_effect=ValueError("Bookmark not found"))

        with app.test_request_context("/api/bookmarks/77", method="DELETE"):
            response, status = bookmark_routes.remove_bookmark(77)

        self.assertEqual(status, 404)
        self.assertEqual(response.get_json(), {"error": "Bookmark not found"})


if __name__ == "__main__":
    unittest.main()

