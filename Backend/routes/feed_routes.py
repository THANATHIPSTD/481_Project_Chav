import random
from flask import Blueprint, current_app, jsonify, request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db, User, Bookmark
from ..services.es_service import search_recipes_in_es, get_random_category_from_es, get_random_keyword_from_es
from ..services.image_service import ImageCacheError, get_cached_optimized_image
from ..services.ml_service import get_home_recommendations

feed_bp = Blueprint('feed', __name__)


def _get_pagination_params():
    page = max(int(request.args.get('page', 1)), 1)
    limit = min(max(int(request.args.get('limit', 15)), 1), 30)
    return page, limit


def _paginate_items(items, page, limit):
    start = (page - 1) * limit
    end = start + limit
    return items[start:end]


@feed_bp.route('/image', methods=['GET'])
def get_optimized_image():
    source_url = request.args.get('url', '').strip()
    if not source_url:
        return '', 400

    try:
        cached_image = get_cached_optimized_image(
            source_url,
            cache_dir=current_app.config['IMAGE_CACHE_DIR'],
            cache_ttl_seconds=current_app.config['IMAGE_CACHE_TTL_SECONDS'],
            default_width=current_app.config['IMAGE_DEFAULT_WIDTH'],
            max_width=current_app.config['IMAGE_MAX_WIDTH'],
            default_quality=current_app.config['IMAGE_DEFAULT_QUALITY'],
            max_source_bytes=current_app.config['IMAGE_MAX_SOURCE_BYTES'],
            requested_width=request.args.get('w'),
            requested_quality=request.args.get('q'),
        )
    except ImageCacheError:
        return '', 502

    response = send_file(cached_image.path, mimetype=cached_image.mimetype, conditional=True)
    response.set_etag(cached_image.etag)
    response.last_modified = cached_image.last_modified
    response.headers['Cache-Control'] = (
        f"public, max-age={current_app.config['IMAGE_BROWSER_CACHE_SECONDS']}, "
        f"stale-while-revalidate={current_app.config['IMAGE_STALE_WHILE_REVALIDATE_SECONDS']}"
    )
    response.headers['X-Image-Cache'] = cached_image.cache_status
    response.make_conditional(request)
    return response

@feed_bp.route('/foryou', methods=['GET'])
@jwt_required(optional=True)
def get_for_you_feed():
    try:
        page, limit = _get_pagination_params()
        user_id = get_jwt_identity()

        if user_id:
            user = db.session.get(User, user_id)
            bookmarks = Bookmark.query.filter_by(user_id=user_id).all()

            recommendation_pool = get_home_recommendations(user, bookmarks, top_k=100)
            total_found = len(recommendation_pool)
            data = _paginate_items(recommendation_pool, page, limit)
            title = "recommend for you"

            if total_found == 0:
                fallback_result = search_recipes_in_es(query="popular", page=page, size=limit)
                data = fallback_result.get('results', [])
                total_found = fallback_result.get('total_found', len(data))
        else:
            fallback_result = search_recipes_in_es(query="delicious", page=page, size=limit)
            data = fallback_result.get('results', [])
            total_found = fallback_result.get('total_found', len(data))
            title = "For you"

        return jsonify({
            "title": title,
            "page": page,
            "limit": limit,
            "total_found": total_found,
            "data": data
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@feed_bp.route('/category', methods=['GET'])
def get_category_feed():
    try:
        page, limit = _get_pagination_params()
        selected_cat = request.args.get('category') or get_random_category_from_es()
        es_result = search_recipes_in_es(query="recipe", page=page, size=limit, category_filter=selected_cat)
        data = es_result.get('results', [])

        return jsonify({
            "title": f"Most popular recipes in category: {selected_cat}",
            "page": page,
            "limit": limit,
            "total_found": es_result.get('total_found', len(data)),
            "category": selected_cat,
            "data": data
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@feed_bp.route('/discover', methods=['GET'])
def get_discover_feed():
    try:
        page, limit = _get_pagination_params()
        random_kw = request.args.get('keyword') or get_random_keyword_from_es()

        es_result = search_recipes_in_es(query=random_kw, page=page, size=limit)
        data = es_result.get('results', [])
        return jsonify({
            "title": "Discovery new recipe",
            "page": page,
            "limit": limit,
            "total_found": es_result.get('total_found', len(data)),
            "keyword_used": random_kw,
            "data": data
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
