from ..models import db, Bookmark, Folder


def add_bookmark(user_id, recipe_id, folder_id, rating):
    folder = Folder.query.filter_by(id=folder_id, user_id=user_id).first()
    if not folder:
        raise ValueError("Folder not found or unauthorized")

    if rating < 1 or rating > 5:
        raise ValueError("Rating must be between 1 and 5")

    existing_bookmark = Bookmark.query.join(Folder).filter(
        Bookmark.recipe_id == recipe_id,
        Folder.user_id == user_id
    ).first()
    if existing_bookmark:
        raise ValueError("Recipe already bookmarked")

    new_bookmark = Bookmark(
        user_id=user_id,
        folder_id=folder_id,
        recipe_id=recipe_id,
        rating=rating
    )

    db.session.add(new_bookmark)
    db.session.commit()
    return new_bookmark


def get_all_user_bookmarks(user_id):
    bookmarks = Bookmark.query.join(Folder).filter(Folder.user_id == user_id).order_by(Bookmark.rating.desc()).all()

    return [{
        "bookmark_id": b.id,
        "folder_id": b.folder_id,
        "folder_name": b.folder.name,
        "recipe_id": b.recipe_id,
        "rating": b.rating,
        "created_at": b.created_at
    } for b in bookmarks]


def update_bookmark(user_id, bookmark_id, new_folder_id=None, new_rating=None):
    bookmark = Bookmark.query.join(Folder).filter(Bookmark.id == bookmark_id, Folder.user_id == user_id).first()
    if not bookmark:
        raise ValueError("Bookmark not found or unauthorized")

    if new_folder_id:
        new_folder = Folder.query.filter_by(id=new_folder_id, user_id=user_id).first()
        if not new_folder:
            raise ValueError("New folder not found")
        bookmark.folder_id = new_folder_id

    if new_rating is not None:
        if new_rating < 1 or new_rating > 5:
            raise ValueError("Rating must be between 1 and 5")
        bookmark.rating = new_rating

    db.session.commit()
    return bookmark


def delete_bookmark(user_id, bookmark_id):
    bookmark = Bookmark.query.join(Folder).filter(Bookmark.id == bookmark_id, Folder.user_id == user_id).first()
    if not bookmark:
        raise ValueError("Bookmark not found or unauthorized")

    db.session.delete(bookmark)
    db.session.commit()
    return True