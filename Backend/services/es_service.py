#es
from elasticsearch import Elasticsearch

es = Elasticsearch("http://localhost:9200")
INDEX_NAME = "recipes"


def _format_recipe_hits(hits):
    results = []
    for hit in hits:
        source = hit['_source']
        images = source.get('Images', [])
        image_url = images[0] if isinstance(images, list) and len(images) > 0 else images

        results.append({
            "id": hit['_id'],
            "name": source.get('Name'),
            "image": image_url,
            "category": source.get('RecipeCategory'),
            "rating": source.get('AggregatedRating'),
            "calories": source.get('Calories'),
            "total_time": source.get('TotalTimeMins'),
            "ingredients": source.get('RecipeIngredientParts')
        })
    return results


def search_recipes_in_es(query, page=1, size=12, category_filter=None):
    search_body = {
        "from": (page - 1) * size,
        "size": size,
        "_source": [
            "Name", "Images", "RecipeCategory", "Keywords",
            "AggregatedRating", "Calories", "CookTimeMins",
            "PrepTimeMins", "TotalTimeMins", "RecipeIngredientParts"
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
                                "Name.ngram^1", "Keywords^2", "RecipeIngredientParts^2"
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
    return {"id": response['_id'], **response['_source']}