#config

import os
from datetime import timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL',
                                        'postgresql://postgres:mysecretpassword@localhost:5432/recipe_db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'super-secret-ir-project-key-2026')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=1)
    IMAGE_CACHE_DIR = os.getenv('IMAGE_CACHE_DIR', os.path.join(BASE_DIR, 'cache', 'images'))
    IMAGE_CACHE_TTL_SECONDS = int(os.getenv('IMAGE_CACHE_TTL_SECONDS', str(60 * 60 * 24 * 30)))
    IMAGE_BROWSER_CACHE_SECONDS = int(os.getenv('IMAGE_BROWSER_CACHE_SECONDS', str(60 * 60 * 24 * 30)))
    IMAGE_STALE_WHILE_REVALIDATE_SECONDS = int(
        os.getenv('IMAGE_STALE_WHILE_REVALIDATE_SECONDS', str(60 * 60 * 24 * 7))
    )
    IMAGE_DEFAULT_WIDTH = int(os.getenv('IMAGE_DEFAULT_WIDTH', '640'))
    IMAGE_MAX_WIDTH = int(os.getenv('IMAGE_MAX_WIDTH', '1920'))
    IMAGE_DEFAULT_QUALITY = int(os.getenv('IMAGE_DEFAULT_QUALITY', '76'))
    IMAGE_MAX_SOURCE_BYTES = int(os.getenv('IMAGE_MAX_SOURCE_BYTES', str(12 * 1024 * 1024)))
