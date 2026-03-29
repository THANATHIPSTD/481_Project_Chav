#rec
#rec
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..models import db, User, Bookmark
from ..services.es_service import recommend_by_keywords
from ..services.ml_service import get_diverse_recommendations

rec_bp = Blueprint('rec', __name__)

@rec_bp.route('/recommend/preferences', methods=['GET'])
@jwt_required()
def recommend_by_preferences():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)

    page = int(request.args.get('page', 1))
    size = int(request.args.get('limit', 15))

    if not user or not user.preferences:
        pref_query = "Healthy"
    else:
        pref_query = user.preferences.replace(",", " ")

    try:
        data = recommend_by_keywords(pref_query, page, size)
        return jsonify({
            "page": page,
            "limit": size,
            **data
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@rec_bp.route('/diverse', methods=['GET'])
@jwt_required()
def recommend_diverse():
    """
    Escape the Bubble: Get diverse and serendipitous recommendations
    """
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)

    limit = int(request.args.get('limit', 12))

    if not user:
        return jsonify({"error": "User not found"}), 404

    try:
        # Get user's bookmarks for diversity analysis
        bookmarks = Bookmark.query.filter_by(user_id=user_id).all()

        results = get_diverse_recommendations(user, bookmarks, top_k=limit)

        return jsonify({
            "results": results,
            "count": len(results)
        }), 200

    except Exception as e:
        print(f"Error in diverse recommendations route: {e}")
        return jsonify({"error": str(e)}), 500