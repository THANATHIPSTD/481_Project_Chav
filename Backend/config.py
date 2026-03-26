#config

import os
from datetime import timedelta


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL',
                                        'postgresql://postgres:mysecretpassword@localhost:5432/recipe_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'super-secret-ir-project-key-2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)