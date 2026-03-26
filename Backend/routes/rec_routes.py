#rec
#rec
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from Backend.models import db, User
from Backend.services.es_service import recommend_by_keywords

rec_bp = Blueprint('rec', __name__)

@rec_bp.route('/recommend/preferences', methods=['GET'])
@jwt_required()
def recommend_by_preferences():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)

    page = int(request.args.get('page', 1))
    size = int(request.args.get('limit', 12))

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