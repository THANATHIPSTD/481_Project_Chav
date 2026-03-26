from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from Backend.models import db
from routes.auth_routes import auth_bp
from routes.search_routes import search_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    db.init_app(app)
    JWTManager(app)

    @app.route('/', methods=['GET'])
    def health_check():
        return jsonify({"status": "success"}), 200

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(search_bp, url_prefix='/api/search')

    return app


if __name__ == '__main__':
    app = create_app()

    with app.app_context():
        db.create_all()

    print("🌟 Starting Flask server on http://localhost:6000")
    app.run(host='0.0.0.0', port=6000, debug=True)