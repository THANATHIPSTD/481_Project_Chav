import sys
import types
import unittest
from unittest.mock import Mock

from Backend.tests.helpers import (
    QueryStub,
    build_fake_models_module,
    import_fresh,
    install_fake_jwt_module,
    make_test_app,
)


jwt_module = install_fake_jwt_module()
fake_models, fake_db, FakeUser, FakeFolder, FakeBookmark = build_fake_models_module()

fake_ml_service = types.ModuleType("Backend.services.ml_service")
fake_ml_service.get_folder_recommendations = lambda *args, **kwargs: []
sys.modules["Backend.services.ml_service"] = fake_ml_service

fake_folder_service = types.ModuleType("Backend.services.folder_service")
fake_folder_service.create_folder = lambda *args, **kwargs: {}
fake_folder_service.get_user_folders = lambda *args, **kwargs: []
fake_folder_service.update_folder = lambda *args, **kwargs: {}
fake_folder_service.delete_folder = lambda *args, **kwargs: True
fake_folder_service.get_bookmarks_in_folder = lambda *args, **kwargs: []
sys.modules["Backend.services.folder_service"] = fake_folder_service

fake_es_service = types.ModuleType("Backend.services.es_service")
fake_es_service.get_recipe_by_id = lambda recipe_id: {"id": recipe_id}
sys.modules["Backend.services.es_service"] = fake_es_service

folder_routes = import_fresh("Backend.routes.folder_routes")
app = make_test_app()


class FolderRoutesUnitTests(unittest.TestCase):
    def setUp(self):
        jwt_module.set_identity("7")
        folder_routes.db.session = Mock()
        FakeBookmark.query = QueryStub()

    def test_get_folders_returns_serialized_folders(self):
        folder_routes.get_user_folders = Mock(return_value=[{"id": 1, "name": "Dinner"}])

        with app.test_request_context("/api/folders", method="GET"):
            response, status = folder_routes.get_folders()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json(), [{"id": 1, "name": "Dinner"}])

    def test_add_folder_requires_name(self):
        with app.test_request_context("/api/folders", method="POST", json={"description": "Meals"}):
            response, status = folder_routes.add_folder()

        self.assertEqual(status, 400)
        self.assertEqual(response.get_json(), {"error": "Folder name is required"})

    def test_add_folder_returns_created_folder(self):
        folder_routes.create_folder = Mock(return_value={"id": 3, "name": "Dinner", "description": "Meals"})

        with app.test_request_context(
            "/api/folders",
            method="POST",
            json={"name": "Dinner", "description": "Meals"},
        ):
            response, status = folder_routes.add_folder()

        self.assertEqual(status, 201)
        self.assertEqual(
            response.get_json(),
            {
                "message": "Folder created successfully",
                "folder": {"id": 3, "name": "Dinner", "description": "Meals"},
            },
        )

    def test_edit_folder_maps_value_error_to_404(self):
        folder_routes.update_folder = Mock(side_effect=ValueError("Folder not found"))

        with app.test_request_context(
            "/api/folders/3",
            method="PUT",
            json={"name": "Updated", "description": "Fresh"},
        ):
            response, status = folder_routes.edit_folder(3)

        self.assertEqual(status, 404)
        self.assertEqual(response.get_json(), {"error": "Folder not found"})

    def test_view_folder_bookmarks_enriches_recipe_details(self):
        folder_routes.get_bookmarks_in_folder = Mock(
            return_value=[
                {"bookmark_id": 1, "recipe_id": 101, "rating": 5, "created_at": "2026-01-01"},
                {"bookmark_id": 2, "recipe_id": 202, "rating": 4, "created_at": "2026-01-02"},
            ]
        )

        def get_recipe_side_effect(recipe_id):
            if recipe_id == 202:
                raise RuntimeError("missing recipe")
            return {"id": recipe_id, "name": "Recipe"}

        folder_routes.get_recipe_by_id = Mock(side_effect=get_recipe_side_effect)

        with app.test_request_context("/api/folders/8/bookmarks", method="GET"):
            response, status = folder_routes.view_folder_bookmarks(8)

        self.assertEqual(status, 200)
        self.assertEqual(
            response.get_json(),
            [
                {
                    "bookmark_id": 1,
                    "user_rating": 5,
                    "saved_at": "2026-01-01",
                    "recipe": {"id": 101, "name": "Recipe"},
                }
            ],
        )

    def test_remove_folder_returns_success_message(self):
        folder_routes.delete_folder = Mock(return_value=True)

        with app.test_request_context("/api/folders/8", method="DELETE"):
            response, status = folder_routes.remove_folder(8)

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json(), {"message": "Folder deleted successfully"})

    def test_recommend_for_folder_rejects_unauthorized_access(self):
        folder = FakeFolder(user_id=99, name="Dinner", id=8)
        folder_routes.db.session.get.return_value = folder

        with app.test_request_context("/api/folders/8/recommendations", method="GET"):
            response, status = folder_routes.recommend_for_folder(8)

        self.assertEqual(status, 404)
        self.assertEqual(response.get_json(), {"error": "Folder not found or unauthorized"})

    def test_recommend_for_folder_returns_ranked_data(self):
        folder = FakeFolder(user_id=7, name="Dinner", id=8)
        folder_routes.db.session.get.return_value = folder
        FakeBookmark.query = QueryStub(all_result=[FakeBookmark(recipe_id=101, rating=5, id=1)])
        folder_routes.get_folder_recommendations = Mock(return_value=[{"id": "101", "name": "Pasta"}])

        with app.test_request_context("/api/folders/8/recommendations", method="GET"):
            response, status = folder_routes.recommend_for_folder(8)

        self.assertEqual(status, 200)
        self.assertEqual(
            response.get_json(),
            {
                "folder_id": 8,
                "folder_name": "Dinner",
                "title": "Menu suite for folder 'Dinner'",
                "data": [{"id": "101", "name": "Pasta"}],
            },
        )


if __name__ == "__main__":
    unittest.main()

