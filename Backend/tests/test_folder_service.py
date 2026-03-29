import importlib
import sys
import types
import unittest
from datetime import datetime
from unittest.mock import Mock

from Backend.tests.helpers import import_fresh

class _SortableCreatedAt:
    @staticmethod
    def desc():
        return "created_at_desc"


class FakeFolder:
    query = None
    created_at = _SortableCreatedAt()

    def __init__(self, user_id, name, description=None):
        self.id = None
        self.user_id = user_id
        self.name = name
        self.description = description
        self.created_at = datetime(2026, 1, 1, 12, 0, 0)
        self.bookmarks = []


fake_models = types.ModuleType("Backend.models")
fake_models.db = types.SimpleNamespace(session=Mock())
fake_models.Folder = FakeFolder
sys.modules["Backend.models"] = fake_models

folder_service = import_fresh("Backend.services.folder_service")


class QueryStub:
    def __init__(self, *, first_result=None, all_result=None):
        self.first_result = first_result
        self.all_result = all_result or []
        self.filter_by_calls = []
        self.order_by_calls = []

    def filter_by(self, **kwargs):
        self.filter_by_calls.append(kwargs)
        return self

    def order_by(self, *args):
        self.order_by_calls.append(args)
        return self

    def first(self):
        return self.first_result

    def all(self):
        return self.all_result


class FolderServiceUnitTests(unittest.TestCase):
    def setUp(self):
        folder_service.db.session = Mock()
        FakeFolder.query = QueryStub()

    def test_create_folder_raises_for_duplicate_name(self):
        existing_folder = FakeFolder(user_id=7, name="Dinner")
        FakeFolder.query = QueryStub(first_result=existing_folder)

        with self.assertRaisesRegex(ValueError, "already exists"):
            folder_service.create_folder(user_id=7, name="Dinner", description="Weeknight meals")

        folder_service.db.session.add.assert_not_called()
        folder_service.db.session.commit.assert_not_called()

    def test_create_folder_returns_serialized_folder(self):
        query = QueryStub(first_result=None)
        FakeFolder.query = query

        def assign_id(folder):
            folder.id = 15

        folder_service.db.session.add.side_effect = assign_id

        result = folder_service.create_folder(user_id=3, name="Desserts", description="Sweet recipes")

        self.assertEqual(query.filter_by_calls[0], {"user_id": 3, "name": "Desserts"})
        self.assertEqual(result["id"], 15)
        self.assertEqual(result["name"], "Desserts")
        self.assertEqual(result["description"], "Sweet recipes")
        folder_service.db.session.commit.assert_called_once()

    def test_get_user_folders_serializes_results(self):
        first_folder = FakeFolder(user_id=5, name="Breakfast", description="AM")
        first_folder.id = 1
        second_folder = FakeFolder(user_id=5, name="Dinner", description="PM")
        second_folder.id = 2

        FakeFolder.query = QueryStub(all_result=[first_folder, second_folder])

        result = folder_service.get_user_folders(user_id=5)

        self.assertEqual(
            result,
            [
                {
                    "id": 1,
                    "name": "Breakfast",
                    "description": "AM",
                    "created_at": first_folder.created_at,
                },
                {
                    "id": 2,
                    "name": "Dinner",
                    "description": "PM",
                    "created_at": second_folder.created_at,
                },
            ],
        )

    def test_update_folder_mutates_fields_and_commits(self):
        folder = FakeFolder(user_id=8, name="Old Name", description="Old Description")
        folder.id = 11
        FakeFolder.query = QueryStub(first_result=folder)

        result = folder_service.update_folder(
            user_id=8,
            folder_id=11,
            new_name="New Name",
            new_description="New Description",
        )

        self.assertEqual(folder.name, "New Name")
        self.assertEqual(folder.description, "New Description")
        self.assertEqual(
            result,
            {
                "id": 11,
                "name": "New Name",
                "description": "New Description",
            },
        )
        folder_service.db.session.commit.assert_called_once()

    def test_delete_folder_raises_when_folder_is_missing(self):
        FakeFolder.query = QueryStub(first_result=None)

        with self.assertRaisesRegex(ValueError, "not found"):
            folder_service.delete_folder(user_id=9, folder_id=77)

        folder_service.db.session.delete.assert_not_called()

    def test_delete_folder_removes_folder_and_commits(self):
        folder = FakeFolder(user_id=9, name="To Delete")
        folder.id = 77
        FakeFolder.query = QueryStub(first_result=folder)

        result = folder_service.delete_folder(user_id=9, folder_id=77)

        self.assertTrue(result)
        folder_service.db.session.delete.assert_called_once_with(folder)
        folder_service.db.session.commit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
