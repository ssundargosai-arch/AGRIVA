from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from app.services.marketplace_listing_management import (
    remove_listing_from_market,
)


def _fake_db_for_owned_listing(
    *,
    listing_status: str,
):
    user = SimpleNamespace(id=uuid4())
    farmer = SimpleNamespace(id=uuid4())
    crop = SimpleNamespace(
        id=uuid4(),
        name="Wheat",
    )
    listing = SimpleNamespace(
        id=uuid4(),
        crop_id=crop.id,
        status=listing_status,
    )

    db = MagicMock()

    farmer_query = MagicMock()
    farmer_query.filter.return_value.first.return_value = farmer

    listing_query = MagicMock()
    (
        listing_query.join.return_value
        .join.return_value
        .join.return_value
        .filter.return_value
        .first.return_value
    ) = (listing, crop)

    favorite_query = MagicMock()
    favorite_query.filter.return_value.delete.return_value = 0

    def query_side_effect(*entities):
        names = {
            getattr(entity, "__name__", "")
            for entity in entities
        }

        if "FarmerProfile" in names:
            return farmer_query

        if "CropListing" in names and "Crop" in names:
            return listing_query

        if "Favorite" in names:
            return favorite_query

        return MagicMock()

    db.query.side_effect = query_side_effect

    return db, user, listing, crop, favorite_query


def test_remove_active_listing_soft_removes_it():
    (
        db,
        user,
        listing,
        crop,
        favorite_query,
    ) = _fake_db_for_owned_listing(
        listing_status="active"
    )

    result_listing, result_crop, changed = (
        remove_listing_from_market(
            db,
            user,
            listing.id,
        )
    )

    assert changed is True
    assert result_listing is listing
    assert result_crop is crop
    assert listing.status == "removed"
    db.commit.assert_called_once()
    db.refresh.assert_called_once_with(listing)
    favorite_query.filter.return_value.delete.assert_called_once()


def test_remove_non_active_listing_is_idempotent():
    db, user, listing, crop, _ = (
        _fake_db_for_owned_listing(
            listing_status="sold"
        )
    )

    result_listing, result_crop, changed = (
        remove_listing_from_market(
            db,
            user,
            listing.id,
        )
    )

    assert changed is False
    assert result_listing is listing
    assert result_crop is crop
    assert listing.status == "sold"
    db.commit.assert_not_called()
