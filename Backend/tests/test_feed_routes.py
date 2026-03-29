import sys
import tempfile
import types
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import Mock, patch

from Backend.tests.helpers import (
    QueryStub,
    build_fake_models_module,
    import_fresh,
    install_fake_jwt_module,
    make_test_app,
)


jwt_module = install_fake_jwt_module()
fake_models, fake_db, FakeUser, FakeFolder, FakeBookmark = build_fake_models_module()

fake_es_service = types.ModuleType("Backend.services.es_service")
fake_es_service.search_recipes_in_es = lambda *args, **kwargs: {}
fake_es_service.get_random_category_from_es = lambda: "Dessert"
sys.modules["Backend.services.es_service"] = fake_es_service

fake_image_service = types.ModuleType("Backend.services.image_service")


class FakeImageCacheError(Exception):
    pass


fake_image_service.ImageCacheError = FakeImageCacheError
fake_image_service.get_cached_optimized_image = lambda *args, **kwargs: None
sys.modules["Backend.services.image_service"] = fake_image_service

fake_ml_service = types.ModuleType("Backend.services.ml_service")
fake_ml_service.get_home_recommendations = lambda *args, **kwargs: []
sys.modules["Backend.services.ml_service"] = fake_ml_service

feed_routes = import_fresh("Backend.routes.feed_routes")
app = make_test_app()


class FeedRoutesUnitTests(unittest.TestCase):
    def setUp(self):
        jwt_module.set_identity(None)
        feed_routes.db.session = Mock()
        FakeBookmark.query = QueryStub()

    def test_get_pagination_params_clamps_values(self):
        with app.test_request_context("/api/feed/foryou", method="GET", query_string={"page": "0", "limit": "100"}):
            page, limit = feed_routes._get_pagination_params()

        self.assertEqual((page, limit), (1, 30))

    def test_paginate_items_returns_requested_slice(self):
        items = list(range(1, 11))
        self.assertEqual(feed_routes._paginate_items(items, page=2, limit=3), [4, 5, 6])

    def test_get_optimized_image_requires_source_url(self):
        with app.test_request_context("/api/feed/image", method="GET", query_string={}):
            result = feed_routes.get_optimized_image()

        self.assertEqual(result, ("", 400))

    def test_get_optimized_image_maps_cache_errors_to_502(self):
        feed_routes.get_cached_optimized_image = Mock(side_effect=feed_routes.ImageCacheError("bad source"))

        with app.test_request_context("/api/feed/image", method="GET", query_string={"url": "https://img.test/a.jpg"}):
            result = feed_routes.get_optimized_image()

        self.assertEqual(result, ("", 502))

    def test_get_optimized_image_returns_cached_asset_with_headers(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            image_path = Path(temp_dir) / "cached.webp"
            image_path.write_bytes(b"image-bytes")
            cached_asset = types.SimpleNamespace(
                path=image_path,
                mimetype="image/webp",
                etag="etag-123",
                last_modified=datetime(2026, 1, 1, tzinfo=timezone.utc),
                cache_status="HIT",
            )
            feed_routes.get_cached_optimized_image = Mock(return_value=cached_asset)

            with app.test_request_context(
                "/api/feed/image",
                method="GET",
                query_string={"url": "https://img.test/a.jpg", "w": "320", "q": "75"},
            ):
                response = feed_routes.get_optimized_image()

        try:
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["X-Image-Cache"], "HIT")
            self.assertIn("public, max-age=600", response.headers["Cache-Control"])
        finally:
            response.close()

    def test_get_for_you_feed_uses_personalized_recommendations_when_logged_in(self):
        jwt_module.set_identity(7)
        feed_routes.db.session.get.return_value = FakeUser(id=7, username="chef")
        FakeBookmark.query = QueryStub(all_result=[FakeBookmark(user_id=7, recipe_id=101, rating=5)])
        feed_routes.get_home_recommendations = Mock(return_value=[{"id": str(i)} for i in range(25)])

        with app.test_request_context("/api/feed/foryou", method="GET", query_string={"page": "2", "limit": "10"}):
            response, status = feed_routes.get_for_you_feed()

        body = response.get_json()
        self.assertEqual(status, 200)
        self.assertEqual(body["title"], "recommend for you")
        self.assertEqual(body["total_found"], 25)
        self.assertEqual(len(body["data"]), 10)
        self.assertEqual(body["data"][0]["id"], "10")

    def test_get_for_you_feed_falls_back_for_guests(self):
        feed_routes.search_recipes_in_es = Mock(return_value={"total_found": 2, "results": [{"id": "1"}, {"id": "2"}]})

        with app.test_request_context("/api/feed/foryou", method="GET", query_string={"page": "1", "limit": "15"}):
            response, status = feed_routes.get_for_you_feed()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json()["title"], "For you")
        feed_routes.search_recipes_in_es.assert_called_once_with(query="delicious", page=1, size=15)

    def test_get_category_feed_uses_selected_category(self):
        feed_routes.search_recipes_in_es = Mock(return_value={"total_found": 1, "results": [{"id": "9"}]})

        with app.test_request_context(
            "/api/feed/category",
            method="GET",
            query_string={"category": "Dessert", "page": "1", "limit": "5"},
        ):
            response, status = feed_routes.get_category_feed()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json()["category"], "Dessert")
        feed_routes.search_recipes_in_es.assert_called_once_with(
            query="recipe",
            page=1,
            size=5,
            category_filter="Dessert",
        )

    def test_get_discover_feed_uses_random_keyword_when_missing(self):
        feed_routes.search_recipes_in_es = Mock(return_value={"total_found": 1, "results": [{"id": "4"}]})

        with patch.object(feed_routes.random, "choice", return_value="spicy"):
            with app.test_request_context("/api/feed/discover", method="GET", query_string={"page": "1", "limit": "7"}):
                response, status = feed_routes.get_discover_feed()

        self.assertEqual(status, 200)
        self.assertEqual(response.get_json()["keyword_used"], "spicy")
        feed_routes.search_recipes_in_es.assert_called_once_with(query="spicy", page=1, size=7)


if __name__ == "__main__":
    unittest.main()
