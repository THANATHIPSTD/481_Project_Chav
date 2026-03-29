#Bookmark
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..services.bookmark_service import (
    add_bookmark, get_all_user_bookmarks,
    update_bookmark, delete_bookmark, check_user_bookmark
)
from ..services.es_service import get_recipe_by_id

bookmark_bp = Blueprint('bookmarks', __name__)


# GET /api/bookmarks/check/<recipe_id>
@bookmark_bp.route('/check/<recipe_id>', methods=['GET'])
@jwt_required()
def check_bookmark(recipe_id):
    try:
        user_id = get_jwt_identity()
        normalized_recipe_id = int(recipe_id)
        status = check_user_bookmark(user_id, normalized_recipe_id)
        return jsonify(status), 200
    except ValueError:
        return jsonify({"error": "Invalid recipe id"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# GET /api/bookmarks
@bookmark_bp.route('', methods=['GET'])
@jwt_required()
def get_bookmarks():
    try:
        user_id = get_jwt_identity()
        bookmarks = get_all_user_bookmarks(user_id)

        results = []
        for b in bookmarks:
            try:
                recipe_detail = get_recipe_by_id(b['recipe_id'])
                b['recipe'] = recipe_detail
                results.append(b)
            except:
                pass

        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bookmark_bp.route('', methods=['POST'])
@jwt_required()
def create_bookmark():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        # รับค่าตามชื่อตัวแปรในรูปที่คุณส่งมา
        recipe_id = int(data.get('recipeId'))
        folder_id = int(data.get('folderId'))
        rating = int(data.get('rating'))

        if not all([recipe_id, folder_id, rating]):
            return jsonify({"error": "recipeId, folderId, and rating are required"}), 400

        bookmark = add_bookmark(user_id, recipe_id, folder_id, rating)
        return jsonify({"message": "Bookmark added", "bookmarkId": bookmark.id}), 201

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bookmark_bp.route('/<int:bookmark_id>', methods=['PATCH'])
@jwt_required()
def patch_bookmark(bookmark_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        new_folder_id = data.get('folderId')
        new_rating = data.get('rating')

        updated = update_bookmark(user_id, bookmark_id, new_folder_id, new_rating)
        return jsonify({"message": "Bookmark updated", "bookmarkId": updated.id}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bookmark_bp.route('/<int:bookmark_id>', methods=['DELETE'])
@jwt_required()
def remove_bookmark(bookmark_id):
    try:
        user_id = get_jwt_identity()
        delete_bookmark(user_id, bookmark_id)
        return jsonify({"message": "Bookmark removed"}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500
