from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)
    db.init_app(app)
    jwt = JWTManager(app)

    @app.route('/', methods=['GET'])
    def health_check():
        return jsonify({
            "status": "success",
            "message": "Backend API is running !"
        }), 200

    return app


if __name__ == '__main__':
    app = create_app()

    with app.app_context():
        db.create_all()

    print("Starting Flask server on http://localhost:6000")
    app.run(host='0.0.0.0', port=6000, debug=True)