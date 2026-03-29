import importlib
import sys
import types
from datetime import datetime
from unittest.mock import Mock

from flask import Flask
from werkzeug.security import check_password_hash, generate_password_hash


def import_fresh(module_name: str):
    sys.modules.pop(module_name, None)
    return importlib.import_module(module_name)


def install_fake_jwt_module():
    module = types.ModuleType("flask_jwt_extended")
    module._identity = None

    def create_access_token(identity):
        return f"token-for-{identity}"

    def get_jwt_identity():
        return module._identity

    def set_identity(identity):
        module._identity = identity

    def jwt_required(optional=False):
        def decorator(fn):
            return fn

        return decorator

    class JWTManager:
        def __init__(self, app=None):
            self.app = app

    module.create_access_token = create_access_token
    module.get_jwt_identity = get_jwt_identity
    module.set_identity = set_identity
    module.jwt_required = jwt_required
    module.JWTManager = JWTManager
    sys.modules["flask_jwt_extended"] = module
    return module


class FakeField:
    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        return ("eq", self.name, other)

    def desc(self):
        return ("desc", self.name)


class SortableCreatedAt:
    @staticmethod
    def desc():
        return "created_at_desc"


class QueryStub:
    def __init__(self, *, first_result=None, all_result=None):
        self.first_result = first_result
        self.all_result = all_result or []
        self.filter_by_calls = []
        self.filter_calls = []
        self.join_calls = []
        self.order_by_calls = []

    def filter_by(self, **kwargs):
        self.filter_by_calls.append(kwargs)
        return self

    def filter(self, *args):
        self.filter_calls.append(args)
        return self

    def join(self, *args):
        self.join_calls.append(args)
        return self

    def order_by(self, *args):
        self.order_by_calls.append(args)
        return self

    def first(self):
        return self.first_result

    def all(self):
        return self.all_result


class ExecuteResult:
    def __init__(self, scalar_result):
        self._scalar_result = scalar_result

    def scalar(self):
        return self._scalar_result


class SelectStub:
    def __init__(self, model):
        self.model = model
        self.filter_by_kwargs = None

    def filter_by(self, **kwargs):
        self.filter_by_kwargs = kwargs
        return self


class FakeDB:
    def __init__(self):
        self.session = Mock()
        self.last_select = None
        self.init_app = Mock()
        self.create_all = Mock()

    def select(self, model):
        self.last_select = SelectStub(model)
        return self.last_select


def build_fake_models_module():
    fake_models = types.ModuleType("Backend.models")
    db = FakeDB()

    class User:
        query = QueryStub()

        def __init__(
            self,
            username=None,
            first_name=None,
            last_name=None,
            preferences=None,
            id=None,
            created_at=None,
        ):
            self.id = id
            self.username = username
            self.first_name = first_name
            self.last_name = last_name
            self.preferences = preferences
            self.created_at = created_at or datetime(2026, 1, 1, 12, 0, 0)
            self.password_hash = None

        def set_password(self, password):
            self.password_hash = generate_password_hash(password)

        def check_password(self, password):
            return check_password_hash(self.password_hash, password)

    class Folder:
        query = QueryStub()
        created_at = SortableCreatedAt()
        user_id = FakeField("user_id")

        def __init__(self, user_id, name, description=None, id=None, created_at=None):
            self.id = id
            self.user_id = user_id
            self.name = name
            self.description = description
            self.created_at = created_at or datetime(2026, 1, 1, 12, 0, 0)
            self.bookmarks = []

    class Bookmark:
        query = QueryStub()
        id = FakeField("id")
        recipe_id = FakeField("recipe_id")
        rating = FakeField("rating")
        folder_id = FakeField("folder_id")
        user_id = FakeField("user_id")

        def __init__(
            self,
            user_id=None,
            folder_id=None,
            recipe_id=None,
            rating=None,
            id=None,
            created_at=None,
        ):
            self.id = id
            self.user_id = user_id
            self.folder_id = folder_id
            self.recipe_id = recipe_id
            self.rating = rating
            self.created_at = created_at or datetime(2026, 1, 1, 12, 0, 0)
            self.folder = None

    fake_models.db = db
    fake_models.User = User
    fake_models.Folder = Folder
    fake_models.Bookmark = Bookmark
    sys.modules["Backend.models"] = fake_models
    return fake_models, db, User, Folder, Bookmark


def make_test_app():
    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        SECRET_KEY="test-secret",
        IMAGE_CACHE_DIR="/tmp/test-image-cache",
        IMAGE_CACHE_TTL_SECONDS=300,
        IMAGE_DEFAULT_WIDTH=640,
        IMAGE_MAX_WIDTH=1920,
        IMAGE_DEFAULT_QUALITY=76,
        IMAGE_MAX_SOURCE_BYTES=1024 * 1024,
        IMAGE_BROWSER_CACHE_SECONDS=600,
        IMAGE_STALE_WHILE_REVALIDATE_SECONDS=60,
    )
    return app
