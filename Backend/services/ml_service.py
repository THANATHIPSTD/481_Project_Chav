import numpy as np
import pandas as pd
import pickle
from pathlib import Path

from elasticsearch import Elasticsearch
from sklearn.metrics.pairwise import cosine_similarity
from .es_service import get_recipe_previews_by_ids

es = Elasticsearch("http://localhost:9200")

models_dir = Path(__file__).resolve().parent.parent / "models"
try:
    tfidf = pickle.load(open(models_dir / "tfidf_model.pkl", "rb"))
    svd = pickle.load(open(models_dir / "svd_model.pkl", "rb"))
    recipe_features = pickle.load(open(models_dir / "recipe_features.pkl", "rb"))
    lgbm_model = pickle.load(open(models_dir / "lgbm_model.pkl", "rb"))
    print("ML Models loaded successfully!")
except FileNotFoundError as e:
    print(f"Error loading models: {e}")
    raise
except Exception as e:
    print(f"Error loading models: {e}")
    raise


def _generate_recommendations_from_vector(target_vector, top_k=15):
    sims = cosine_similarity(target_vector.reshape(1, -1), recipe_features.values)[0]
    candidate_indices = sims.argsort()[-100:][::-1]
    candidate_ids = recipe_features.index[candidate_indices].tolist()
    candidate_dna = recipe_features.loc[candidate_ids].values

    query = {
        "query": {"terms": {"RecipeId": candidate_ids}},
        "_source": ["RecipeId", "Calories", "FatContent", "ProteinContent", "TotalTimeMins"],
        "size": 100
    }

    es_response = es.search(index="recipes", body=query)
    numeric_dict = {}
    for hit in es_response['hits']['hits']:
        src = hit['_source']
        rid = str(src.get('RecipeId'))
        numeric_dict[rid] = [
            float(src.get('Calories', 0)),
            float(src.get('FatContent', 0)),
            float(src.get('ProteinContent', 0)),
            float(src.get('TotalTimeMins', 0))
        ]

    candidate_numeric = []
    for rid in candidate_ids:
        candidate_numeric.append(numeric_dict.get(rid, [0, 0, 0, 0]))
    candidate_numeric = np.array(candidate_numeric)

    X_rank = np.hstack([candidate_dna, candidate_numeric])
    preds = lgbm_model.predict(X_rank)

    results_df = pd.DataFrame({'RecipeId': candidate_ids, 'Score': preds})
    final_ids = results_df.sort_values('Score', ascending=False).head(top_k)['RecipeId'].tolist()

    return get_recipe_previews_by_ids(final_ids)



def get_home_recommendations(user, bookmarks, top_k=15):
    user_vector = np.zeros(100)

    if bookmarks:
        total_weight = 0
        for b in bookmarks:
            rid = str(b.recipe_id)
            if rid in recipe_features.index:
                weight = float(b.rating) - 2.5
                user_vector += (recipe_features.loc[rid].values * weight)
                total_weight += abs(weight)
        if total_weight > 0: user_vector /= total_weight

    elif user and user.preferences:
        text_vector = tfidf.transform([user.preferences.replace(",", " ")])
        user_vector = svd.transform(text_vector)[0]

    return _generate_recommendations_from_vector(user_vector, top_k)


def get_diverse_recommendations(user, bookmarks, top_k=15):

    # 1. Get user's favorite categories from bookmarks
    user_categories = set()
    if bookmarks:
        # We need to fetch recipe details to see categories
        bookmark_ids = [str(b.recipe_id) for b in bookmarks]
        # Quick ES lookup for categories
        query = {
            "query": {"terms": {"RecipeId": bookmark_ids}},
            "_source": ["RecipeCategory"],
            "size": 50
        }
        res = es.search(index="recipes", body=query)
        for hit in res['hits']['hits']:
            cat = hit['_source'].get('RecipeCategory')
            if cat: user_categories.add(cat)

    # 2. Search for high-rated recipes, excluding user's common categories if possible
    # We'll fetch a larger pool and filter/rank them for diversity
    must_not = []
    if user_categories:
        must_not = [{"term": {"RecipeCategory": cat}} for cat in list(user_categories)[:5]]

    search_query = {
        "size": 100,
        "query": {
            "bool": {
                "must": [
                    {"range": {"AggregatedRating": {"gte": 4.5}}},
                    {"range": {"ReviewCount": {"gte": 5}}}
                ],
                "must_not": must_not
            }
        }
    }

    try:
        es_response = es.search(index="recipes", body=search_query)
        candidates = []
        for hit in es_response['hits']['hits']:
            src = hit['_source']
            rid = str(hit['_id'] if 'RecipeId' not in src else src['RecipeId'])
            candidates.append(rid)
        
        if len(candidates) < top_k:
            fallback_query = {"size": 50, "query": {"range": {"AggregatedRating": {"gte": 4.0}}}}
            res = es.search(index="recipes", body=fallback_query)
            candidates.extend([str(h['_source'].get('RecipeId') or h['_id']) for h in res['hits']['hits']])
            candidates = list(dict.fromkeys(candidates)) # Deduplicate


        valid_candidates = [rid for rid in candidates if rid in recipe_features.index]
        if not valid_candidates:
            return get_recipe_previews_by_ids(candidates[:top_k])

        discovery_vector = np.random.normal(0, 0.1, 100)
        
        sims = cosine_similarity(discovery_vector.reshape(1, -1), recipe_features.loc[valid_candidates].values)[0]
        
        results_df = pd.DataFrame({'RecipeId': valid_candidates, 'Sim': sims})
        diverse_pool = results_df.sort_values('Sim', ascending=False).head(40)
        final_ids = diverse_pool.sample(min(top_k, len(diverse_pool)))['RecipeId'].tolist()

        return get_recipe_previews_by_ids(final_ids)

    except Exception as e:
        print(f"Error in diverse recommendations: {e}")
        return get_recipe_previews_by_ids(candidates[:top_k]) if 'candidates' in locals() else []



def get_folder_recommendations(folder_name, folder_bookmarks, top_k=15):
    folder_vector = np.zeros(100)

    if folder_bookmarks:
        total_weight = 0
        for b in folder_bookmarks:
            rid = str(b.recipe_id)
            if rid in recipe_features.index:
                weight = float(b.rating) if hasattr(b, 'rating') else 5.0
                folder_vector += (recipe_features.loc[rid].values * weight)
                total_weight += weight
        if total_weight > 0: folder_vector /= total_weight

    else:
        text_vector = tfidf.transform([folder_name])
        folder_vector = svd.transform(text_vector)[0]

    return _generate_recommendations_from_vector(folder_vector, top_k)
