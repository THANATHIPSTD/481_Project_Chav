from ..models import db, Folder


def create_folder(user_id, name, description=None):
    existing_folder = Folder.query.filter_by(user_id=user_id, name=name).first()
    if existing_folder:
        raise ValueError("Folder with this name already exists")

    new_folder = Folder(user_id=user_id, name=name, description=description)
    db.session.add(new_folder)
    db.session.commit()

    return {
        "id": new_folder.id,
        "name": new_folder.name,
        "description": new_folder.description,
        "created_at": new_folder.created_at
    }


def get_user_folders(user_id):
    folders = Folder.query.filter_by(user_id=user_id).order_by(Folder.created_at.desc()).all()
    return [{
        "id": f.id,
        "name": f.name,
        "description": f.description,
        "created_at": f.created_at
    } for f in folders]


def update_folder(user_id, folder_id, new_name=None, new_description=None):
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        raise ValueError("Folder not found or unauthorized")

    if new_name:
        folder.name = new_name
    if new_description is not None:
        folder.description = new_description

    db.session.commit()
    return {
        "id": folder.id,
        "name": folder.name,
        "description": folder.description
    }


def get_bookmarks_in_folder(user_id, folder_id):
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        raise ValueError("Folder not found or unauthorized")

    return [{
        "bookmark_id": b.id,
        "recipe_id": b.recipe_id,
        "rating": b.rating,
        "created_at": b.created_at
    } for b in folder.bookmarks]


def delete_folder(user_id, folder_id):
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        raise ValueError("Folder not found or unauthorized")

    db.session.delete(folder)
    db.session.commit()
    return True