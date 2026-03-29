import os
import unittest
from unittest.mock import patch

from Backend.tests.helpers import import_fresh


class ConfigUnitTests(unittest.TestCase):
    def test_default_config_values_are_loaded(self):
        with patch.dict(os.environ, {}, clear=True):
            config_module = import_fresh("Backend.config")

        self.assertTrue(config_module.Config.JWT_SECRET_KEY)
        self.assertEqual(config_module.Config.IMAGE_DEFAULT_WIDTH, 640)
        self.assertEqual(config_module.Config.IMAGE_MAX_WIDTH, 1920)
        self.assertEqual(config_module.Config.IMAGE_DEFAULT_QUALITY, 76)

    def test_environment_variables_override_defaults(self):
        with patch.dict(
            os.environ,
            {
                "DATABASE_URL": "sqlite:///test.db",
                "JWT_SECRET_KEY": "override-secret",
                "IMAGE_DEFAULT_WIDTH": "320",
                "IMAGE_MAX_SOURCE_BYTES": "2048",
            },
            clear=True,
        ):
            config_module = import_fresh("Backend.config")

        self.assertEqual(config_module.Config.SQLALCHEMY_DATABASE_URI, "sqlite:///test.db")
        self.assertEqual(config_module.Config.JWT_SECRET_KEY, "override-secret")
        self.assertEqual(config_module.Config.IMAGE_DEFAULT_WIDTH, 320)
        self.assertEqual(config_module.Config.IMAGE_MAX_SOURCE_BYTES, 2048)


if __name__ == "__main__":
    unittest.main()
