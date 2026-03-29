#es
from elasticsearch import Elasticsearch
import random


es = Elasticsearch("http://localhost:9200")
INDEX_NAME = "recipes"


def _extract_image_url(images):
    image_url = None

    if isinstance(images, list) and len(images) > 0:
        image_url = images[0]
    elif isinstance(images, str):
        if images not in ["n/a", "nan"]:
            cleaned = images.replace('c("', '').replace('")', '')
            img_list = [u.strip().replace('"', '').replace("'", "") for u in cleaned.split(", ")]
            valid_urls = [u for u in img_list if u.startswith("http")]
            if valid_urls:
                image_url = valid_urls[0]

    return image_url


def format_recipe_preview(recipe_id, source):
    return {
        "id": recipe_id,
        "name": source.get('Name'),
        "image": _extract_image_url(source.get('Images', [])),
        "category": source.get('RecipeCategory'),
        "rating": source.get('AggregatedRating'),
        "calories": source.get('Calories'),
        "total_time": source.get('TotalTimeMins'),
        "ingredients": source.get('RecipeIngredientParts')
    }


def _format_recipe_hits(hits):
    results = []
    for hit in hits:
        results.append(format_recipe_preview(hit['_id'], hit['_source']))
    return results


def get_recipe_previews_by_ids(recipe_ids):
    if not recipe_ids:
        return []

    normalized_ids = []
    for recipe_id in recipe_ids:
        try:
            normalized_ids.append(int(recipe_id))
        except (TypeError, ValueError):
            continue

    if not normalized_ids:
        return []

    search_body = {
        "size": len(normalized_ids),
        "_source": [
            "RecipeId", "Name", "Images", "RecipeCategory",
            "AggregatedRating", "Calories", "TotalTimeMins", "RecipeIngredientParts"
        ],
        "query": {
            "terms": {
                "RecipeId": normalized_ids
            }
        }
    }

    response = es.search(index=INDEX_NAME, body=search_body)
    sources_by_recipe_id = {}

    for hit in response["hits"]["hits"]:
        source = hit["_source"]
        source_recipe_id = str(source.get("RecipeId") or hit["_id"])
        sources_by_recipe_id[source_recipe_id] = source

    results = []
    for recipe_id in normalized_ids:
        source = sources_by_recipe_id.get(str(recipe_id))
        if source:
            results.append(format_recipe_preview(str(recipe_id), source))

    return results


def search_recipes_in_es(query, page=1, size=12, category_filter=None):
    search_body = {
        "from": (page - 1) * size,
        "size": size,
        "_source": [
            "Name", "Images", "RecipeCategory", "Keywords",
            "AggregatedRating", "Calories", "CookTimeMins",
            "PrepTimeMins", "TotalTimeMins", "RecipeIngredientParts",
            "RecipeInstructions"
        ],
        "query": {
            "bool": {
                "must": [
                    {
                        "multi_match": {
                            "query": query,
                            "type": "most_fields",
                            "fields": [
                                "Name^10", "Name.shingle^5", "Name.english^3",
                                "Name.ngram^1", "Keywords^3", "RecipeIngredientParts^2",
                                "RecipeInstructions^1.5"
                            ],
                            "fuzziness": "AUTO"
                        }
                    }
                ]
            }
        },
        "suggest": {
            "text": query,
            "spell_check": {
                "term": {"field": "Name", "suggest_mode": "always"}
            }
        }
    }

    if category_filter:
        search_body["query"]["bool"]["filter"] = [{"term": {"RecipeCategory": category_filter}}]

    response = es.search(index=INDEX_NAME, body=search_body)

    results = _format_recipe_hits(response['hits']['hits'])

    did_you_mean = None
    suggest_options = response.get('suggest', {}).get('spell_check', [])
    if suggest_options and suggest_options[0]['options']:
        did_you_mean = suggest_options[0]['options'][0]['text']

    return {
        "total_found": response['hits']['total']['value'],
        "results": results,
        "did_you_mean": did_you_mean
    }


def get_autocomplete_suggestions(query):
    search_body = {
        "suggest": {
            "recipe-suggest": {
                "prefix": query,
                "completion": {
                    "field": "NameSuggest",
                    "size": 5,
                    "skip_duplicates": True
                }
            }
        }
    }
    response = es.search(index=INDEX_NAME, body=search_body)
    options = response.get('suggest', {}).get('recipe-suggest', [])[0].get('options', [])
    return [{"id": opt['_id'], "name": opt['text']} for opt in options]


def recommend_by_keywords(pref_query, page=1, size=12):
    search_body = {
        "from": (page - 1) * size,
        "size": size,
        "query": {
            "match": {"Keywords": pref_query}
        },
        "_source": [
            "Name", "Images", "RecipeCategory", "Keywords",
            "AggregatedRating", "Calories", "CookTimeMins",
            "PrepTimeMins", "TotalTimeMins", "RecipeIngredientParts"
        ]
    }
    response = es.search(index=INDEX_NAME, body=search_body)
    results = _format_recipe_hits(response['hits']['hits'])

    return {
        "total_found": response['hits']['total']['value'],
        "results": results
    }


def get_recipe_by_id(recipe_id):
    response = es.get(index=INDEX_NAME, id=recipe_id)
    source = response.get('_source', {})
    
    images = source.get('Images', [])
    if isinstance(images, str):
        if images == "n/a" or images == "nan":
            source['Images'] = []
        else:
            cleaned = images.replace('c("', '').replace('")', '')
            img_list = [u.strip().replace('"', '').replace("'", "") for u in cleaned.split(", ")]
            source['Images'] = [u for u in img_list if u.startswith("http")]
            
    return {"id": response['_id'], **source}


def get_random_category_from_es():
    search_body = {
        "size": 0,
        "aggs": {
            "all_categories": {
                "terms": {
                    "field": "RecipeCategory",
                    "size": 50
                }
            }
        }
    }

    try:
        response = es.search(index=INDEX_NAME, body=search_body)
        buckets = response.get('aggregations', {}).get('all_categories', {}).get('buckets', [])
        real_categories = [bucket['key'] for bucket in buckets if bucket['key']]

        if real_categories:
            return random.choice(real_categories)
        else:
            return "Dessert"

    except Exception as e:
        print(f"ES Aggregation Error: {e}")
        return "Dessert"


def get_random_keyword_from_es():
    # Since 'Keywords' is a text field without a keyword sub-field, 
    # we'll use RecipeCategory or common recipe search terms for discovery to ensure variety.
    search_body = {
        "size": 0,
        "aggs": {
            "top_categories": {
                "terms": {
                    "field": "RecipeCategory",
                    "size": 50
                }
            }
        }
    }

    try:
        response = es.search(index=INDEX_NAME, body=search_body)
        buckets = response.get('aggregations', {}).get('top_categories', {}).get('buckets', [])
        real_keywords = [bucket['key'] for bucket in buckets if bucket['key']]

        if real_keywords:
            return random.choice(real_keywords)
        else:
            return "healthy"

    except Exception as e:
        print(f"ES Aggregation Error: {e}")
        return "healthy"
