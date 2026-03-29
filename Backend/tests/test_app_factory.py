import sys
import types
import unittest

from flask import Blueprint

from Backend.tests.helpers import build_fake_models_module, import_fresh, install_fake_jwt_module


install_fake_jwt_module()
fake_models, fake_db, FakeUser, FakeFolder, FakeBookmark = build_fake_models_module()


def _install_blueprint_stub(module_name, attr_name, blueprint_name):
    module = types.ModuleType(module_name)
    blueprint = Blueprint(blueprint_name, __name__)
    module.__dict__[attr_name] = blueprint
    sys.modules[module_name] = module


_install_blueprint_stub("Backend.routes.auth_routes", "auth_bp", "auth")
_install_blueprint_stub("Backend.routes.search_routes", "search_bp", "search")
_install_blueprint_stub("Backend.routes.rec_routes", "rec_bp", "rec")
_install_blueprint_stub("Backend.routes.folder_routes", "folder_bp", "folders")
_install_blueprint_stub("Backend.routes.bookmark_routes", "bookmark_bp", "bookmarks")
_install_blueprint_stub("Backend.routes.feed_routes", "feed_bp", "feed")

app_module = import_fresh("Backend.app")


class AppFactoryUnitTests(unittest.TestCase):
    def test_create_app_registers_blueprints_and_health_route(self):
        app = app_module.create_app()
        client = app.test_client()

        response = client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "success"})
        self.assertIn("auth", app.blueprints)
        self.assertIn("search", app.blueprints)
        self.assertIn("rec", app.blueprints)
        self.assertIn("folders", app.blueprints)
        self.assertIn("bookmarks", app.blueprints)
        self.assertIn("feed", app.blueprints)
        app_module.db.init_app.assert_called_once()


if __name__ == "__main__":
    unittest.main()
