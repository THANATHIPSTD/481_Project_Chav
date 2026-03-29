import importlib
import sys
import types
import unittest
from unittest.mock import patch

from Backend.tests.helpers import import_fresh

if "elasticsearch" not in sys.modules:
    fake_elasticsearch = types.ModuleType("elasticsearch")

    class FakeElasticsearch:
        def __init__(self, *args, **kwargs):
            self.args = args
            self.kwargs = kwargs

    fake_elasticsearch.Elasticsearch = FakeElasticsearch
    sys.modules["elasticsearch"] = fake_elasticsearch


es_service = import_fresh("Backend.services.es_service")


class StubElasticsearchClient:
    def __init__(self, *, search_response=None, get_response=None, search_error=None):
        self.search_response = search_response
        self.get_response = get_response
        self.search_error = search_error
        self.search_calls = []
        self.get_calls = []

    def search(self, *, index, body):
        self.search_calls.append({"index": index, "body": body})
        if self.search_error:
            raise self.search_error
        return self.search_response

    def get(self, *, index, id):
        self.get_calls.append({"index": index, "id": id})
        return self.get_response


class ESServiceUnitTests(unittest.TestCase):
    def test_extract_image_url_handles_lists_and_serialized_vectors(self):
        self.assertEqual(
            es_service._extract_image_url(["https://cdn.example.com/recipe.jpg", "fallback.jpg"]),
            "https://cdn.example.com/recipe.jpg",
        )
        self.assertEqual(
            es_service._extract_image_url(
                'c("https://cdn.example.com/recipe.jpg", "https://cdn.example.com/extra.jpg")'
            ),
            "https://cdn.example.com/recipe.jpg",
        )

    def test_extract_image_url_ignores_empty_markers(self):
        self.assertIsNone(es_service._extract_image_url("n/a"))
        self.assertIsNone(es_service._extract_image_url("nan"))
        self.assertIsNone(es_service._extract_image_url([]))

    def test_format_recipe_preview_maps_expected_fields(self):
        preview = es_service.format_recipe_preview(
            "42",
            {
                "Name": "Roasted Pumpkin Soup",
                "Images": ["https://cdn.example.com/soup.jpg"],
                "RecipeCategory": "Soup",
                "AggregatedRating": 4.8,
                "Calories": 320,
                "TotalTimeMins": 45,
                "RecipeIngredientParts": ["pumpkin", "cream"],
            },
        )

        self.assertEqual(preview["id"], "42")
        self.assertEqual(preview["name"], "Roasted Pumpkin Soup")
        self.assertEqual(preview["image"], "https://cdn.example.com/soup.jpg")
        self.assertEqual(preview["category"], "Soup")
        self.assertEqual(preview["rating"], 4.8)

    def test_get_recipe_previews_by_ids_normalizes_ids_and_preserves_input_order(self):
        stub_es = StubElasticsearchClient(
            search_response={
                "hits": {
                    "hits": [
                        {
                            "_id": "2",
                            "_source": {
                                "RecipeId": 2,
                                "Name": "Second",
                                "Images": ["https://cdn.example.com/second.jpg"],
                                "RecipeCategory": "Dinner",
                                "AggregatedRating": 4.3,
                                "Calories": 500,
                                "TotalTimeMins": 30,
                                "RecipeIngredientParts": ["a"],
                            },
                        },
                        {
                            "_id": "5",
                            "_source": {
                                "RecipeId": 5,
                                "Name": "Fifth",
                                "Images": ["https://cdn.example.com/fifth.jpg"],
                                "RecipeCategory": "Dessert",
                                "AggregatedRating": 4.9,
                                "Calories": 420,
                                "TotalTimeMins": 25,
                                "RecipeIngredientParts": ["b"],
                            },
                        },
                    ]
                }
            }
        )

        original_es = es_service.es
        es_service.es = stub_es
        try:
            results = es_service.get_recipe_previews_by_ids(["5", "bad-id", 2])
        finally:
            es_service.es = original_es

        self.assertEqual([item["id"] for item in results], ["5", "2"])
        self.assertEqual(
            stub_es.search_calls[0]["body"]["query"]["terms"]["RecipeId"],
            [5, 2],
        )

    def test_search_recipes_in_es_applies_category_filter_and_returns_suggestion(self):
        stub_es = StubElasticsearchClient(
            search_response={
                "hits": {
                    "total": {"value": 1},
                    "hits": [
                        {
                            "_id": "9",
                            "_source": {
                                "Name": "Garlic Pasta",
                                "Images": ["https://cdn.example.com/pasta.jpg"],
                                "RecipeCategory": "Dinner",
                                "AggregatedRating": 4.5,
                                "Calories": 610,
                                "TotalTimeMins": 20,
                                "RecipeIngredientParts": ["garlic", "pasta"],
                            },
                        }
                    ],
                },
                "suggest": {
                    "spell_check": [
                        {
                            "options": [{"text": "garlic pasta"}],
                        }
                    ]
                },
            }
        )

        original_es = es_service.es
        es_service.es = stub_es
        try:
            result = es_service.search_recipes_in_es(
                "garic pasta",
                page=2,
                size=12,
                category_filter="Dinner",
            )
        finally:
            es_service.es = original_es

        search_body = stub_es.search_calls[0]["body"]
        self.assertEqual(search_body["from"], 12)
        self.assertEqual(search_body["query"]["bool"]["filter"], [{"term": {"RecipeCategory": "Dinner"}}])
        self.assertEqual(result["total_found"], 1)
        self.assertEqual(result["did_you_mean"], "garlic pasta")
        self.assertEqual(result["results"][0]["name"], "Garlic Pasta")

    def test_get_recipe_by_id_converts_serialized_image_strings_to_lists(self):
        stub_es = StubElasticsearchClient(
            get_response={
                "_id": "18",
                "_source": {
                    "Name": "Lemon Cake",
                    "Images": 'c("https://cdn.example.com/cake.jpg", "bad-value")',
                },
            }
        )

        original_es = es_service.es
        es_service.es = stub_es
        try:
            recipe = es_service.get_recipe_by_id("18")
        finally:
            es_service.es = original_es

        self.assertEqual(recipe["id"], "18")
        self.assertEqual(recipe["Images"], ["https://cdn.example.com/cake.jpg"])

    def test_get_random_category_from_es_returns_fallback_on_error(self):
        stub_es = StubElasticsearchClient(search_error=RuntimeError("ES offline"))

        original_es = es_service.es
        es_service.es = stub_es
        try:
            with patch("builtins.print"):
                category = es_service.get_random_category_from_es()
        finally:
            es_service.es = original_es

        self.assertEqual(category, "Dessert")

    def test_get_random_category_from_es_returns_random_choice_from_buckets(self):
        stub_es = StubElasticsearchClient(
            search_response={
                "aggregations": {
                    "all_categories": {
                        "buckets": [
                            {"key": "Breakfast"},
                            {"key": "Dinner"},
                        ]
                    }
                }
            }
        )

        original_es = es_service.es
        es_service.es = stub_es
        try:
            with patch.object(es_service.random, "choice", return_value="Dinner") as mock_choice:
                category = es_service.get_random_category_from_es()
        finally:
            es_service.es = original_es

        mock_choice.assert_called_once_with(["Breakfast", "Dinner"])
        self.assertEqual(category, "Dinner")


    def test_search_recipes_in_es_includes_recipe_instructions_in_query(self):
        stub_es = StubElasticsearchClient(
            search_response={
                "hits": {"total": {"value": 0}, "hits": []}
            }
        )

        original_es = es_service.es
        es_service.es = stub_es
        try:
            es_service.search_recipes_in_es("bake chicken")
        finally:
            es_service.es = original_es

        search_body = stub_es.search_calls[0]["body"]
        fields = search_body["query"]["bool"]["must"][0]["multi_match"]["fields"]
        
        # Check if RecipeInstructions is in the search fields
        instruction_field = [f for f in fields if f.startswith("RecipeInstructions")]
        self.assertTrue(len(instruction_field) > 0, "RecipeInstructions should be in search fields")
        self.assertIn("RecipeInstructions^1.5", fields)
        
        # Check if RecipeInstructions is in the _source list
        self.assertIn("RecipeInstructions", search_body["_source"])


if __name__ == "__main__":
    unittest.main()
