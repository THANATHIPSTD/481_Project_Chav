from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models import db, User

from ..services.es_service import (
    search_recipes_in_es,
    get_autocomplete_suggestions,
    recommend_by_keywords,
    get_recipe_by_id
)

search_bp = Blueprint('search', __name__)

@search_bp.route('', methods=['GET'])
def search_recipes():
    query = request.args.get('q', '')
    page = int(request.args.get('page', 1))
    size = int(request.args.get('limit', 15))
    category_filter = request.args.get('category', None)

    if not query:
        return jsonify({"error": "Missing search query"}), 400

    try:
        data = search_recipes_in_es(query, page, size, category_filter)
        return jsonify({
            "page": page,
            "limit": size,
            **data
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@search_bp.route('/autocomplete', methods=['GET'])
def autocomplete():
    query = request.args.get('q', '')

    if len(query) < 2:
        return jsonify([]), 200

    try:
        results = get_autocomplete_suggestions(query)
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#
# @search_bp.route('/recommend/preferences', methods=['GET'])
# @jwt_required()
# def recommend_by_preferences():
#     user_id = get_jwt_identity()
#     user = db.session.get(User, user_id)
#
#     page = int(request.args.get('page', 1))
#     size = int(request.args.get('limit', 12))
#
#     if not user or not user.preferences:
#         pref_query = "Healthy"
#     else:
#         pref_query = user.preferences.replace(",", " ")
#
#     try:
#         data = recommend_by_keywords(pref_query, page, size)
#         return jsonify({
#             "page": page,
#             "limit": size,
#             **data
#         }), 200
#
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


@search_bp.route('/<recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    try:
        data = get_recipe_by_id(recipe_id)
        return jsonify(data), 200
    except Exception as e:
        return jsonify({"error": "Recipe not found or ES error"}), 404