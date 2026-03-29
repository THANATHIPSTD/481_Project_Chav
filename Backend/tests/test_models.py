import importlib.util
import sys
import types
import unittest
from pathlib import Path


def _load_models_module():
    fake_flask_sqlalchemy = types.ModuleType("flask_sqlalchemy")

    class FakeModel:
        def __init__(self, **kwargs):
            self.__dict__.update(kwargs)

    class SQLAlchemy:
        Integer = int
        String = str
        Text = str
        DateTime = object

        def __init__(self):
            self.Model = FakeModel

        def Column(self, *args, **kwargs):
            return None

        def ForeignKey(self, *args, **kwargs):
            return None

        def relationship(self, *args, **kwargs):
            return None

    fake_flask_sqlalchemy.SQLAlchemy = SQLAlchemy
    sys.modules["flask_sqlalchemy"] = fake_flask_sqlalchemy

    module_name = "backend_models_under_test"
    sys.modules.pop(module_name, None)
    spec = importlib.util.spec_from_file_location(
        module_name,
        Path(__file__).resolve().parents[1] / "models.py",
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class ModelsUnitTests(unittest.TestCase):
    def test_user_password_hashing_and_validation(self):
        models = _load_models_module()
        user = models.User(username="chef")
        user.set_password("secret")

        self.assertNotEqual(user.password_hash, "secret")
        self.assertTrue(user.check_password("secret"))
        self.assertFalse(user.check_password("wrong"))

    def test_folder_and_bookmark_instances_accept_keyword_fields(self):
        models = _load_models_module()
        folder = models.Folder(user_id=7, name="Dinner", description="Meals")
        bookmark = models.Bookmark(user_id=7, folder_id=8, recipe_id=101, rating=5)

        self.assertEqual(folder.user_id, 7)
        self.assertEqual(folder.name, "Dinner")
        self.assertEqual(bookmark.recipe_id, 101)
        self.assertEqual(bookmark.rating, 5)


if __name__ == "__main__":
    unittest.main()

