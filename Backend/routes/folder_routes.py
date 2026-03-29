from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db, Folder, Bookmark
from ..services.ml_service import get_folder_recommendations

from ..services.folder_service import (
    create_folder, get_user_folders, update_folder,
    delete_folder, get_bookmarks_in_folder
)
from ..services.es_service import get_recipe_by_id

folder_bp = Blueprint('folders', __name__)


@folder_bp.route('', methods=['GET'])
@jwt_required()
def get_folders():
    try:
        folders = get_user_folders(get_jwt_identity())
        return jsonify(folders), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@folder_bp.route('', methods=['POST'])
@jwt_required()
def add_folder():
    try:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description')

        if not name:
            return jsonify({"error": "Folder name is required"}), 400

        new_folder = create_folder(get_jwt_identity(), name, description)
        return jsonify({"message": "Folder created successfully", "folder": new_folder}), 201
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@folder_bp.route('/<int:folder_id>', methods=['PUT'])
@jwt_required()
def edit_folder(folder_id):
    try:
        data = request.get_json()
        updated_folder = update_folder(
            get_jwt_identity(),
            folder_id,
            new_name=data.get('name'),
            new_description=data.get('description')
        )
        return jsonify({"message": "Folder updated", "folder": updated_folder}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@folder_bp.route('/<int:folder_id>/bookmarks', methods=['GET'])
@jwt_required()
def view_folder_bookmarks(folder_id):
    try:
        bookmarks = get_bookmarks_in_folder(get_jwt_identity(), folder_id)

        results = []
        for b in bookmarks:
            try:
                recipe_detail = get_recipe_by_id(b['recipe_id'])
                results.append({
                    "bookmark_id": b['bookmark_id'],
                    "user_rating": b['rating'],
                    "saved_at": b['created_at'],
                    "recipe": recipe_detail
                })
            except:
                pass

        return jsonify(results), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@folder_bp.route('/<int:folder_id>', methods=['DELETE'])
@jwt_required()
def remove_folder(folder_id):
    try:
        delete_folder(get_jwt_identity(), folder_id)
        return jsonify({"message": "Folder deleted successfully"}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@folder_bp.route('/<int:folder_id>/recommendations', methods=['GET'])
@jwt_required()
def recommend_for_folder(folder_id):
    try:
        user_id = int(get_jwt_identity())
        folder = db.session.get(Folder, folder_id)

        if not folder or folder.user_id != user_id:
            return jsonify({"error": "Folder not found or unauthorized"}), 404

        folder_bookmarks = Bookmark.query.filter_by(folder_id=folder_id).all()
        recommended_data = get_folder_recommendations(folder.name, folder_bookmarks, top_k=15)

        return jsonify({
            "folder_id": folder.id,
            "folder_name": folder.name,
            "title": f"Menu suite for folder '{folder.name}'",
            "data": recommended_data
        }), 200

    except ValueError:
        return jsonify({"error": "Invalid user identity format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500