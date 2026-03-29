import sys
import types
import unittest
from unittest.mock import Mock

from Backend.tests.helpers import build_fake_models_module, import_fresh, install_fake_jwt_module, make_test_app


jwt_module = install_fake_jwt_module()
fake_models, fake_db, FakeUser, FakeFolder, FakeBookmark = build_fake_models_module()

fake_es_service = types.ModuleType("Backend.services.es_service")
fake_es_service.recommend_by_keywords = lambda *args, **kwargs: {}
sys.modules["Backend.services.es_service"] = fake_es_service

rec_routes = import_fresh("Backend.routes.rec_routes")
app = make_test_app()


class RecRoutesUnitTests(unittest.TestCase):
    def setUp(self):
        jwt_module.set_identity(7)
        rec_routes.db.session = Mock()

    def test_recommend_by_preferences_uses_healthy_fallback_for_missing_user(self):
        rec_routes.db.session.get.return_value = None
        rec_routes.recommend_by_keywords = Mock(return_value={"total_found": 0, "results": []})

        with app.test_request_context("/api/rec/recommend/preferences", method="GET", query_string={"page": "1"}):
            response, status = rec_routes.recommend_by_preferences()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json()["page"], 1)
        rec_routes.recommend_by_keywords.assert_called_once_with("Healthy", 1, 15)

    def test_recommend_by_preferences_expands_comma_separated_preferences(self):
        rec_routes.db.session.get.return_value = FakeUser(id=7, username="chef", preferences="Thai,Spicy")
        rec_routes.recommend_by_keywords = Mock(return_value={"total_found": 1, "results": [{"id": "10"}]})

        with app.test_request_context(
            "/api/rec/recommend/preferences",
            method="GET",
            query_string={"page": "2", "limit": "12"},
        ):
            response, status = rec_routes.recommend_by_preferences()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json()["limit"], 12)
        rec_routes.recommend_by_keywords.assert_called_once_with("Thai Spicy", 2, 12)


if __name__ == "__main__":
    unittest.main()

