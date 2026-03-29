import random
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db, User, Bookmark
from ..services.es_service import search_recipes_in_es, get_random_category_from_es, format_recipe_preview
from ..services.ml_service import get_home_recommendations

feed_bp = Blueprint('feed', __name__)

@feed_bp.route('/foryou', methods=['GET'])
@jwt_required(optional=True)
def get_for_you_feed():
    try:
        user_id = get_jwt_identity()

        if user_id:
            user = db.session.get(User, user_id)
            bookmarks = Bookmark.query.filter_by(user_id=user_id).all()

            raw_data = get_home_recommendations(user, bookmarks, top_k=15)
            data = [format_recipe_preview(recipe["id"], recipe) for recipe in raw_data]
            title = "recommend for you"

            if not data:
                data = search_recipes_in_es(query="popular", size=15).get('results', [])
        else:

            data = search_recipes_in_es(query="delicious", size=15).get('results', [])
            title = "For you"

        return jsonify({"title": title, "data": data}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@feed_bp.route('/category', methods=['GET'])
def get_category_feed():
    try:
        selected_cat = get_random_category_from_es()


        es_result = search_recipes_in_es(query="recipe", size=15, category_filter=selected_cat)
        data = es_result.get('results', [])

        return jsonify({
            "title": f"Most popular recipes in category: {selected_cat}",
            "category": selected_cat,
            "data": data
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feed_bp.route('/discover', methods=['GET'])
def get_discover_feed():
    try:
        keywords = ["easy", "quick", "spicy", "sweet", "baked", "fried"]
        random_kw = random.choice(keywords)

        es_result = search_recipes_in_es(query=random_kw, size=15)
        data = es_result.get('results', [])
        return jsonify({
            "title": "Discovery new recipe",
            "keyword_used": random_kw,
            "data": data
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
