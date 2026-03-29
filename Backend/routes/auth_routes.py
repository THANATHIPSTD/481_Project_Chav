from flask import Blueprint, request, jsonify
from ..models import db, User
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    first_name = data.get('first_name')
    last_name = data.get('last_name')

    if not username or not password:
        return jsonify({"error": "Missing username or password"}), 400

    existing_user = db.session.execute(db.select(User).filter_by(username=username)).scalar()

    if existing_user:
        return jsonify({"error": "Username already exists"}), 400

    new_user = User(
        username=username,
        first_name=first_name,
        last_name=last_name
    )
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully!"}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = db.session.execute(db.select(User).filter_by(username=username)).scalar()

    if user and user.check_password(password):
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "message": "Login successful",
            "access_token": access_token,
            "username": user.username
        }), 200

    return jsonify({"error": "Invalid username or password"}), 401


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = db.session.execute(db.select(User).filter_by(id=user_id)).scalar()

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "preferences": user.preferences,
        "created_at": user.created_at
    }), 200


@auth_bp.route('/update-preferences', methods=['POST'])
@jwt_required()
def update_preferences():
    user_id = get_jwt_identity()
    data = request.get_json()

    pref_list = data.get('preferences', [])

    user = db.session.execute(db.select(User).filter_by(id=user_id)).scalar()
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.preferences = ",".join(pref_list)
    db.session.commit()

    return jsonify({
        "message": "Preferences saved successfully!",
        "preferences": user.preferences
    }), 200

@auth_bp.route('/update-profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    
    user = db.session.execute(db.select(User).filter_by(id=user_id)).scalar()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name
        
    db.session.commit()
    
    return jsonify({
        "message": "Profile updated successfully!",
        "first_name": user.first_name,
        "last_name": user.last_name
    }), 200