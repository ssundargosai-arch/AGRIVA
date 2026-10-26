"""
AGRIVA - Safe Demo Order Cleanup

Purpose
-------
Remove demo/test marketplace orders created by demo buyer accounts while:
- preserving users, farmers, buyers, crops, and listings,
- deleting dependent payment/transaction/transport/tracking/order-item rows,
- restoring listing quantity that was reserved by demo orders,
- keeping rejected/cancelled orders from being restored twice,
- running in PREVIEW mode by default.

Default demo selector:
    user email ending with @agriva.demo

Usage
-----
Preview only (recommended first):
    python -m app.scripts.cleanup_demo_orders

Apply cleanup:
    python -m app.scripts.cleanup_demo_orders --apply

Preview a specific demo buyer:
    python -m app.scripts.cleanup_demo_orders --email buyer@agriva.demo

Apply for a specific demo buyer:
    python -m app.scripts.cleanup_demo_orders --email buyer@agriva.demo --apply

Dangerous: preview ALL marketplace orders:
    python -m app.scripts.cleanup_demo_orders --all-orders

Dangerous: remove ALL marketplace orders:
    python -m app.scripts.cleanup_demo_orders --all-orders --apply

Notes
-----
- The script never deletes User, BuyerProfile, Buyer, Crop, Farm, or CropListing records.
- Stock is restored for pending/accepted/completed demo orders because those orders
  previously reserved/reduced listing inventory.
- Stock is NOT restored for rejected/cancelled orders because AGRIVA's order-status
  logic already restores stock when those statuses are reached.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from dataclasses import dataclass
from typing import Iterable
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.finance import Payment, Transaction
from app.models.market import Buyer, CropListing, Order, OrderItem
from app.models.order_tracking import OrderTrackingEvent
from app.models.support import TransportBooking
from app.models.user import BuyerProfile, User


DEMO_DOMAIN = "agriva.demo"

# AGRIVA already restores stock when an order becomes rejected/cancelled.
# Restoring again during cleanup would double the stock.
ALREADY_RESTORED_STATUSES = {
    "rejected",
    "cancelled",
}


@dataclass
class CleanupStats:
    orders: int = 0
    order_items: int = 0
    tracking_events: int = 0
    payments: int = 0
    transactions: int = 0
    transport_bookings: int = 0
    listings_restored: int = 0
    quantity_restored_kg: float = 0.0


def normalize_status(value: str | None) -> str:
    return str(value or "").strip().lower()


def get_session() -> tuple[Session, object]:
    """
    Reuse AGRIVA's own database dependency so the script follows
    the same SQLAlchemy configuration as FastAPI.
    """
    generator = get_db()
    db = next(generator)
    return db, generator


def find_target_orders(
    db: Session,
    *,
    email: str | None,
    email_domain: str,
    all_orders: bool,
) -> list[Order]:
    query = db.query(Order)

    if all_orders:
        return (
            query
            .order_by(Order.created_at.asc())
            .all()
        )

    query = (
        query
        .join(
            Buyer,
            Order.buyer_id == Buyer.id,
        )
        .join(
            BuyerProfile,
            Buyer.buyer_profile_id == BuyerProfile.id,
        )
        .join(
            User,
            BuyerProfile.user_id == User.id,
        )
    )

    if email:
        query = query.filter(
            User.email.ilike(email.strip())
        )
    else:
        domain = email_domain.strip().lstrip("@")

        query = query.filter(
            User.email.ilike(f"%@{domain}")
        )

    return (
        query
        .order_by(Order.created_at.asc())
        .all()
    )


def buyer_email_for_order(
    db: Session,
    order: Order,
) -> str:
    row = (
        db.query(User.email)
        .join(
            BuyerProfile,
            BuyerProfile.user_id == User.id,
        )
        .join(
            Buyer,
            Buyer.buyer_profile_id == BuyerProfile.id,
        )
        .filter(
            Buyer.id == order.buyer_id
        )
        .first()
    )

    return (
        str(row[0])
        if row and row[0]
        else "unknown"
    )


def order_items_for_orders(
    db: Session,
    order_ids: list[UUID],
) -> list[OrderItem]:
    if not order_ids:
        return []

    return (
        db.query(OrderItem)
        .filter(
            OrderItem.order_id.in_(order_ids)
        )
        .all()
    )


def calculate_stock_restoration(
    orders: Iterable[Order],
    order_items: Iterable[OrderItem],
) -> dict[UUID, float]:
    """
    Return:
        {listing_id: quantity_to_restore}

    Only restore stock for orders whose stock has NOT already been restored.
    """
    order_map = {
        order.id: order
        for order in orders
    }

    restored_by_listing: dict[UUID, float] = defaultdict(float)

    for item in order_items:
        order = order_map.get(
            item.order_id
        )

        if order is None:
            continue

        status = normalize_status(
            order.status
        )

        if status in ALREADY_RESTORED_STATUSES:
            continue

        quantity = float(
            item.quantity_kg or 0.0
        )

        if quantity <= 0:
            continue

        restored_by_listing[
            order.listing_id
        ] += quantity

    return dict(restored_by_listing)


def count_dependencies(
    db: Session,
    order_ids: list[UUID],
) -> CleanupStats:
    stats = CleanupStats(
        orders=len(order_ids)
    )

    if not order_ids:
        return stats

    stats.order_items = (
        db.query(OrderItem)
        .filter(
            OrderItem.order_id.in_(order_ids)
        )
        .count()
    )

    stats.tracking_events = (
        db.query(OrderTrackingEvent)
        .filter(
            OrderTrackingEvent.order_id.in_(order_ids)
        )
        .count()
    )

    payment_ids = [
        row[0]
        for row in (
            db.query(Payment.id)
            .filter(
                Payment.order_id.in_(order_ids)
            )
            .all()
        )
    ]

    stats.payments = len(
        payment_ids
    )

    if payment_ids:
        stats.transactions = (
            db.query(Transaction)
            .filter(
                Transaction.payment_id.in_(
                    payment_ids
                )
            )
            .count()
        )

    stats.transport_bookings = (
        db.query(TransportBooking)
        .filter(
            TransportBooking.order_id.in_(
                order_ids
            )
        )
        .count()
    )

    return stats


def print_preview(
    db: Session,
    orders: list[Order],
    stock_restore: dict[UUID, float],
    stats: CleanupStats,
) -> None:
    print("")
    print("=" * 72)
    print(" AGRIVA DEMO ORDER CLEANUP - PREVIEW")
    print("=" * 72)

    if not orders:
        print("No matching orders found.")
        return

    print("")
    print("Orders selected:")
    print("-" * 72)

    for order in orders:
        email = buyer_email_for_order(
            db,
            order,
        )

        print(
            f"{order.id} | "
            f"{email} | "
            f"status={order.status} | "
            f"amount=Rs.{float(order.total_amount):.2f}"
        )

    print("")
    print("Dependent records that will be deleted:")
    print(f"  orders             : {stats.orders}")
    print(f"  order_items        : {stats.order_items}")
    print(f"  tracking_events    : {stats.tracking_events}")
    print(f"  payments           : {stats.payments}")
    print(f"  transactions       : {stats.transactions}")
    print(f"  transport_bookings : {stats.transport_bookings}")

    print("")
    print("Inventory restoration:")
    print("-" * 72)

    if not stock_restore:
        print("  No listing quantity needs restoration.")
    else:
        for listing_id, quantity in stock_restore.items():
            listing = (
                db.query(CropListing)
                .filter(
                    CropListing.id == listing_id
                )
                .first()
            )

            current_qty = (
                float(
                    listing.quantity_kg
                    or 0.0
                )
                if listing
                else 0.0
            )

            after_qty = (
                current_qty
                + quantity
            )

            current_status = (
                listing.status
                if listing
                else "missing"
            )

            print(
                f"  listing={listing_id} | "
                f"{current_qty:.2f} kg -> "
                f"{after_qty:.2f} kg | "
                f"status={current_status}"
            )

    print("")
    print(
        "Nothing has been changed yet."
    )
    print(
        "Run again with --apply only after checking this preview."
    )


def apply_cleanup(
    db: Session,
    orders: list[Order],
    stock_restore: dict[UUID, float],
) -> CleanupStats:
    order_ids = [
        order.id
        for order in orders
    ]

    stats = count_dependencies(
        db,
        order_ids,
    )

    if not order_ids:
        return stats

    try:
        # -------------------------------------------------------------
        # 1. Restore marketplace inventory affected by demo/test orders
        # -------------------------------------------------------------
        for listing_id, quantity in stock_restore.items():
            listing = (
                db.query(CropListing)
                .filter(
                    CropListing.id == listing_id
                )
                .with_for_update()
                .first()
            )

            if listing is None:
                raise RuntimeError(
                    f"Listing {listing_id} was not found. "
                    "Cleanup stopped to protect database consistency."
                )

            listing.quantity_kg = (
                float(
                    listing.quantity_kg
                    or 0.0
                )
                + float(quantity)
            )

            # If the demo order exhausted the listing, it may have been
            # marked sold. Re-open it after stock is restored.
            if (
                listing.quantity_kg > 0
                and normalize_status(
                    listing.status
                ) == "sold"
            ):
                listing.status = "active"

            stats.listings_restored += 1
            stats.quantity_restored_kg += float(
                quantity
            )

        # -------------------------------------------------------------
        # 2. Delete children before parent orders
        # -------------------------------------------------------------
        payment_ids = [
            row[0]
            for row in (
                db.query(Payment.id)
                .filter(
                    Payment.order_id.in_(
                        order_ids
                    )
                )
                .all()
            )
        ]

        if payment_ids:
            db.query(Transaction).filter(
                Transaction.payment_id.in_(
                    payment_ids
                )
            ).delete(
                synchronize_session=False
            )

        db.query(TransportBooking).filter(
            TransportBooking.order_id.in_(
                order_ids
            )
        ).delete(
            synchronize_session=False
        )

        db.query(OrderTrackingEvent).filter(
            OrderTrackingEvent.order_id.in_(
                order_ids
            )
        ).delete(
            synchronize_session=False
        )

        if payment_ids:
            db.query(Payment).filter(
                Payment.id.in_(
                    payment_ids
                )
            ).delete(
                synchronize_session=False
            )

        db.query(OrderItem).filter(
            OrderItem.order_id.in_(
                order_ids
            )
        ).delete(
            synchronize_session=False
        )

        db.query(Order).filter(
            Order.id.in_(
                order_ids
            )
        ).delete(
            synchronize_session=False
        )

        db.commit()

    except Exception:
        db.rollback()
        raise

    return stats


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Safely preview or remove AGRIVA demo/test marketplace orders."
        )
    )

    parser.add_argument(
        "--apply",
        action="store_true",
        help=(
            "Actually change the database. "
            "Without this flag the script is preview-only."
        ),
    )

    parser.add_argument(
        "--email",
        type=str,
        default=None,
        help=(
            "Target one exact buyer email, "
            "for example buyer@agriva.demo."
        ),
    )

    parser.add_argument(
        "--email-domain",
        type=str,
        default=DEMO_DOMAIN,
        help=(
            "Target buyer emails ending with this domain. "
            f"Default: {DEMO_DOMAIN}"
        ),
    )

    parser.add_argument(
        "--all-orders",
        action="store_true",
        help=(
            "DANGEROUS: target every marketplace order, "
            "not only demo-account orders."
        ),
    )

    return parser


def main() -> None:
    args = build_parser().parse_args()

    if (
        args.all_orders
        and not args.apply
    ):
        print(
            "WARNING: --all-orders selected. "
            "This preview includes EVERY marketplace order."
        )

    if (
        args.all_orders
        and args.apply
    ):
        confirmation = input(
            "DANGER: This will delete ALL marketplace orders. "
            "Type DELETE ALL ORDERS to continue: "
        ).strip()

        if confirmation != "DELETE ALL ORDERS":
            print(
                "Cancelled. Database was not changed."
            )
            return

    db, generator = get_session()

    try:
        orders = find_target_orders(
            db,
            email=args.email,
            email_domain=args.email_domain,
            all_orders=args.all_orders,
        )

        order_ids = [
            order.id
            for order in orders
        ]

        items = order_items_for_orders(
            db,
            order_ids,
        )

        stock_restore = (
            calculate_stock_restoration(
                orders,
                items,
            )
        )

        stats = count_dependencies(
            db,
            order_ids,
        )

        print_preview(
            db,
            orders,
            stock_restore,
            stats,
        )

        if not args.apply:
            return

        if not orders:
            return

        print("")
        confirmation = input(
            "Type CLEAN DEMO ORDERS to apply this cleanup: "
        ).strip()

        if confirmation != "CLEAN DEMO ORDERS":
            print(
                "Cancelled. Database was not changed."
            )
            return

        applied = apply_cleanup(
            db,
            orders,
            stock_restore,
        )

        print("")
        print("=" * 72)
        print(" CLEANUP COMPLETE")
        print("=" * 72)
        print(
            f"Orders removed       : {applied.orders}"
        )
        print(
            f"Order items removed  : {applied.order_items}"
        )
        print(
            f"Tracking removed     : {applied.tracking_events}"
        )
        print(
            f"Payments removed     : {applied.payments}"
        )
        print(
            f"Transactions removed : {applied.transactions}"
        )
        print(
            f"Transport removed    : {applied.transport_bookings}"
        )
        print(
            f"Listings restored    : {applied.listings_restored}"
        )
        print(
            "Quantity restored    : "
            f"{applied.quantity_restored_kg:.2f} kg"
        )
        print("")
        print(
            "Demo/test users and marketplace listings were preserved."
        )
        print(
            "New buyer orders can now be created normally through "
            "POST /api/orders / the Marketplace UI."
        )

    finally:
        try:
            generator.close()
        except Exception:
            db.close()


if __name__ == "__main__":
    main()
