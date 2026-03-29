import sys
import types
import unittest
from unittest.mock import Mock

from Backend.tests.helpers import build_fake_models_module, import_fresh, install_fake_jwt_module, make_test_app


install_fake_jwt_module()
build_fake_models_module()

fake_es_service = types.ModuleType("Backend.services.es_service")
fake_es_service.search_recipes_in_es = lambda *args, **kwargs: {}
fake_es_service.get_autocomplete_suggestions = lambda *args, **kwargs: []
fake_es_service.recommend_by_keywords = lambda *args, **kwargs: {}
fake_es_service.get_recipe_by_id = lambda recipe_id: {"id": recipe_id}
sys.modules["Backend.services.es_service"] = fake_es_service

search_routes = import_fresh("Backend.routes.search_routes")
app = make_test_app()


class SearchRoutesUnitTests(unittest.TestCase):
    def test_search_requires_query(self):
        with app.test_request_context("/api/search", method="GET", query_string={}):
            response, status = search_routes.search_recipes()

        self.assertEqual(status, 400)
        self.assertEqual(response.get_json(), {"error": "Missing search query"})

    def test_search_returns_paginated_results(self):
        search_routes.search_recipes_in_es = Mock(
            return_value={"total_found": 1, "results": [{"id": "101"}], "did_you_mean": None}
        )

        with app.test_request_context(
            "/api/search",
            method="GET",
            query_string={"q": "pasta", "page": "2", "limit": "12", "category": "Dinner"},
        ):
            response, status = search_routes.search_recipes()

        self.assertEqual(status, 200)
        self.assertEqual(
            response.get_json(),
            {
                "page": 2,
                "limit": 12,
                "total_found": 1,
                "results": [{"id": "101"}],
                "did_you_mean": None,
            },
        )
        search_routes.search_recipes_in_es.assert_called_once_with("pasta", 2, 12, "Dinner")

    def test_autocomplete_short_query_returns_empty_list(self):
        with app.test_request_context("/api/search/autocomplete", method="GET", query_string={"q": "a"}):
            response, status = search_routes.autocomplete()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json(), [])

    def test_autocomplete_returns_suggestions(self):
        search_routes.get_autocomplete_suggestions = Mock(return_value=[{"id": "1", "name": "Pasta"}])

        with app.test_request_context("/api/search/autocomplete", method="GET", query_string={"q": "pa"}):
            response, status = search_routes.autocomplete()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json(), [{"id": "1", "name": "Pasta"}])

    def test_get_recipe_maps_errors_to_404(self):
        search_routes.get_recipe_by_id = Mock(side_effect=RuntimeError("not found"))

        with app.test_request_context("/api/search/999", method="GET"):
            response, status = search_routes.get_recipe("999")

        self.assertEqual(status, 404)
        self.assertEqual(response.get_json(), {"error": "Recipe not found or ES error"})


if __name__ == "__main__":
    unittest.main()

