import unittest
from unittest.mock import Mock

from Backend.tests.helpers import (
    ExecuteResult,
    build_fake_models_module,
    import_fresh,
    install_fake_jwt_module,
    make_test_app,
)


jwt_module = install_fake_jwt_module()
fake_models, fake_db, FakeUser, FakeFolder, FakeBookmark = build_fake_models_module()
auth_routes = import_fresh("Backend.routes.auth_routes")
app = make_test_app()


class AuthRoutesUnitTests(unittest.TestCase):
    def setUp(self):
        auth_routes.db.session = Mock()
        jwt_module.set_identity(None)

    def test_register_requires_username_and_password(self):
        with app.test_request_context("/api/auth/register", method="POST", json={"username": "chef"}):
            response, status = auth_routes.register()

        self.assertEqual(status, 400)
        self.assertEqual(response.get_json(), {"error": "Missing username or password"})

    def test_register_rejects_duplicate_username(self):
        auth_routes.db.session.execute.return_value = ExecuteResult(FakeUser(username="chef"))

        with app.test_request_context(
            "/api/auth/register",
            method="POST",
            json={"username": "chef", "password": "secret"},
        ):
            response, status = auth_routes.register()

        self.assertEqual(status, 400)
        self.assertEqual(response.get_json(), {"error": "Username already exists"})

    def test_register_creates_user_and_hashes_password(self):
        auth_routes.db.session.execute.return_value = ExecuteResult(None)

        with app.test_request_context(
            "/api/auth/register",
            method="POST",
            json={
                "username": "chef",
                "password": "secret",
                "first_name": "Pat",
                "last_name": "Lee",
            },
        ):
            response, status = auth_routes.register()

        added_user = auth_routes.db.session.add.call_args.args[0]
        self.assertEqual(status, 201)
        self.assertEqual(response.get_json(), {"message": "User registered successfully!"})
        self.assertEqual(auth_routes.db.last_select.filter_by_kwargs, {"username": "chef"})
        self.assertEqual(added_user.username, "chef")
        self.assertTrue(added_user.check_password("secret"))
        self.assertNotEqual(added_user.password_hash, "secret")

    def test_login_returns_token_for_valid_credentials(self):
        user = FakeUser(username="chef", id=9)
        user.set_password("secret")
        auth_routes.db.session.execute.return_value = ExecuteResult(user)

        with app.test_request_context(
            "/api/auth/login",
            method="POST",
            json={"username": "chef", "password": "secret"},
        ):
            response, status = auth_routes.login()

        self.assertEqual(status, 200)
        self.assertEqual(
            response.get_json(),
            {
                "message": "Login successful",
                "access_token": "token-for-9",
                "username": "chef",
            },
        )

    def test_login_rejects_invalid_credentials(self):
        auth_routes.db.session.execute.return_value = ExecuteResult(None)

        with app.test_request_context(
            "/api/auth/login",
            method="POST",
            json={"username": "chef", "password": "wrong"},
        ):
            response, status = auth_routes.login()

        self.assertEqual(status, 401)
        self.assertEqual(response.get_json(), {"error": "Invalid username or password"})

    def test_me_returns_404_when_user_is_missing(self):
        jwt_module.set_identity("12")
        auth_routes.db.session.execute.return_value = ExecuteResult(None)

        with app.test_request_context("/api/auth/me", method="GET"):
            response, status = auth_routes.me()

        self.assertEqual(status, 404)
        self.assertEqual(response.get_json(), {"error": "User not found"})

    def test_update_preferences_joins_preference_list(self):
        jwt_module.set_identity("12")
        user = FakeUser(username="chef", id=12)
        auth_routes.db.session.execute.return_value = ExecuteResult(user)

        with app.test_request_context(
            "/api/auth/update-preferences",
            method="POST",
            json={"preferences": ["spicy", "healthy"]},
        ):
            response, status = auth_routes.update_preferences()

        self.assertEqual(status, 200)
        self.assertEqual(user.preferences, "spicy,healthy")
        self.assertEqual(
            response.get_json(),
            {
                "message": "Preferences saved successfully!",
                "preferences": "spicy,healthy",
            },
        )

    def test_update_profile_updates_name_fields(self):
        jwt_module.set_identity("12")
        user = FakeUser(username="chef", id=12, first_name="Old", last_name="Name")
        auth_routes.db.session.execute.return_value = ExecuteResult(user)

        with app.test_request_context(
            "/api/auth/update-profile",
            method="PUT",
            json={"first_name": "New", "last_name": "Chef"},
        ):
            response, status = auth_routes.update_profile()

        self.assertEqual(status, 200)
        self.assertEqual(user.first_name, "New")
        self.assertEqual(user.last_name, "Chef")
        self.assertEqual(
            response.get_json(),
            {
                "message": "Profile updated successfully!",
                "first_name": "New",
                "last_name": "Chef",
            },
        )


if __name__ == "__main__":
    unittest.main()

