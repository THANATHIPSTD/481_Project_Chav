import sys
import types
import unittest
from pathlib import Path
from unittest.mock import Mock, mock_open, patch

import numpy as np
import pandas as pd

from Backend.tests.helpers import import_fresh


def _build_recipe_features():
    data = np.zeros((3, 100))
    data[0, 0] = 1.0
    data[1, 1] = 1.0
    data[2, 2] = 1.0
    return pd.DataFrame(data, index=["101", "202", "303"])


def _import_ml_service_under_test():
    fake_elasticsearch = types.ModuleType("elasticsearch")

    class FakeElasticsearch:
        def __init__(self, *args, **kwargs):
            self.args = args
            self.kwargs = kwargs

        def search(self, *args, **kwargs):
            return {"hits": {"hits": []}}

    fake_elasticsearch.Elasticsearch = FakeElasticsearch
    sys.modules["elasticsearch"] = fake_elasticsearch

    fake_es_service = types.ModuleType("Backend.services.es_service")
    fake_es_service.get_recipe_previews_by_ids = Mock(side_effect=lambda ids: ids)
    sys.modules["Backend.services.es_service"] = fake_es_service

    tfidf = Mock()
    svd = Mock()
    recipe_features = _build_recipe_features()
    lgbm_model = Mock()

    with patch("builtins.open", mock_open(read_data=b"model")), patch(
        "pickle.load",
        side_effect=[tfidf, svd, recipe_features, lgbm_model],
    ), patch("builtins.print"):
        module = import_fresh("Backend.services.ml_service")

    return module, fake_es_service.get_recipe_previews_by_ids, tfidf, svd, recipe_features, lgbm_model


class MLServiceUnitTests(unittest.TestCase):
    def test_generate_recommendations_ranks_candidates_by_model_score(self):
        ml_service, get_recipe_previews_by_ids, tfidf, svd, recipe_features, lgbm_model = _import_ml_service_under_test()
        lgbm_model.predict.return_value = np.array([0.1, 0.5, 0.9])
        ml_service.es = types.SimpleNamespace(
            search=Mock(
                return_value={
                    "hits": {
                        "hits": [
                            {"_source": {"RecipeId": "101", "Calories": 100, "FatContent": 10, "ProteinContent": 5, "TotalTimeMins": 20}},
                            {"_source": {"RecipeId": "303", "Calories": 150, "FatContent": 8, "ProteinContent": 7, "TotalTimeMins": 25}},
                            {"_source": {"RecipeId": "202", "Calories": 200, "FatContent": 12, "ProteinContent": 10, "TotalTimeMins": 30}},
                        ]
                    }
                }
            )
        )

        target_vector = np.zeros(100)
        target_vector[0] = 1.0
        result = ml_service._generate_recommendations_from_vector(target_vector, top_k=2)

        self.assertEqual(result, ["202", "303"])
        get_recipe_previews_by_ids.assert_called_once_with(["202", "303"])

    def test_get_home_recommendations_uses_weighted_bookmarks_vector(self):
        ml_service, get_recipe_previews_by_ids, tfidf, svd, recipe_features, lgbm_model = _import_ml_service_under_test()
        ml_service._generate_recommendations_from_vector = Mock(return_value=["ok"])
        bookmarks = [
            types.SimpleNamespace(recipe_id=101, rating=5),
            types.SimpleNamespace(recipe_id=202, rating=1),
        ]

        result = ml_service.get_home_recommendations(user=None, bookmarks=bookmarks, top_k=5)

        vector_arg = ml_service._generate_recommendations_from_vector.call_args.args[0]
        expected = ((recipe_features.loc["101"].values * 2.5) + (recipe_features.loc["202"].values * -1.5)) / 4.0
        np.testing.assert_allclose(vector_arg, expected)
        self.assertEqual(result, ["ok"])
        self.assertEqual(ml_service._generate_recommendations_from_vector.call_args.args[1], 5)

    def test_get_home_recommendations_uses_preferences_when_no_bookmarks(self):
        ml_service, get_recipe_previews_by_ids, tfidf, svd, recipe_features, lgbm_model = _import_ml_service_under_test()
        tfidf.transform.return_value = "text-vector"
        svd.transform.return_value = np.array([np.full(100, 0.25)])
        ml_service._generate_recommendations_from_vector = Mock(return_value=["ok"])
        user = types.SimpleNamespace(preferences="Thai,Spicy")

        result = ml_service.get_home_recommendations(user=user, bookmarks=[], top_k=3)

        tfidf.transform.assert_called_once_with(["Thai Spicy"])
        vector_arg = ml_service._generate_recommendations_from_vector.call_args.args[0]
        np.testing.assert_allclose(vector_arg, np.full(100, 0.25))
        self.assertEqual(result, ["ok"])

    def test_get_folder_recommendations_uses_folder_name_when_no_bookmarks(self):
        ml_service, get_recipe_previews_by_ids, tfidf, svd, recipe_features, lgbm_model = _import_ml_service_under_test()
        tfidf.transform.return_value = "folder-vector"
        svd.transform.return_value = np.array([np.full(100, 0.5)])
        ml_service._generate_recommendations_from_vector = Mock(return_value=["folder-ok"])

        result = ml_service.get_folder_recommendations("Weeknight Meals", [], top_k=4)

        tfidf.transform.assert_called_once_with(["Weeknight Meals"])
        vector_arg = ml_service._generate_recommendations_from_vector.call_args.args[0]
        np.testing.assert_allclose(vector_arg, np.full(100, 0.5))
        self.assertEqual(result, ["folder-ok"])


if __name__ == "__main__":
    unittest.main()

