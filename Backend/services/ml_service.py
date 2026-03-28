import numpy as np
import pandas as pd
import pickle
from pathlib import Path

from elasticsearch import Elasticsearch
from sklearn.metrics.pairwise import cosine_similarity
from .es_service import get_recipe_by_id

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


def _generate_recommendations_from_vector(target_vector, top_k=12):
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

    final_recipes = []
    for rid in final_ids:
        try:
            recipe_data = get_recipe_by_id(rid)
            if recipe_data: final_recipes.append(recipe_data)
        except:
            pass

    return final_recipes



def get_home_recommendations(user, bookmarks, top_k=12):
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



def get_folder_recommendations(folder_name, folder_bookmarks, top_k=12):
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