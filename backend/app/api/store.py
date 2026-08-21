from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc, or_
from sqlalchemy.orm import Session

from app.api.dependencies import require_farmer
from app.db.session import get_db
from app.models.store import (
    Cart,
    CartItem,
    Product,
    ProductCategory,
    StoreOrder,
    StoreOrderItem,
)
from app.models.user import User


router = APIRouter(
    prefix="/api/store",
    tags=["AGRIVA Store"],
)


# ---------------------------------------------------------
# STORE HEALTH
# ---------------------------------------------------------

@router.get("/health")
def store_health():
    return {
        "success": True,
        "message": "AGRIVA Store API is running",
    }


# ---------------------------------------------------------
# CATEGORIES
# ---------------------------------------------------------

@router.get("/categories")
def get_categories(
    db: Session = Depends(get_db),
):
    categories = (
        db.query(ProductCategory)
        .order_by(ProductCategory.name.asc())
        .all()
    )

    return {
        "success": True,
        "categories": [
            {
                "id": str(category.id),
                "name": category.name,
            }
            for category in categories
        ],
    }


# ---------------------------------------------------------
# PRODUCTS
# ---------------------------------------------------------

@router.get("/products")
def get_products(
    search: str | None = None,
    category_id: UUID | None = None,
    sort: str = Query(
        default="name",
        pattern="^(name|price_low|price_high)$",
    ),
    db: Session = Depends(get_db),
):
    query = db.query(Product)

    if search:
        pattern = f"%{search}%"

        query = query.filter(
            or_(
                Product.name.ilike(pattern),
                Product.description.ilike(pattern),
            )
        )

    if category_id:
        query = query.filter(
            Product.category_id == category_id
        )

    if sort == "price_low":
        query = query.order_by(
            asc(Product.price)
        )

    elif sort == "price_high":
        query = query.order_by(
            desc(Product.price)
        )

    else:
        query = query.order_by(
            asc(Product.name)
        )

    products = query.all()

    return {
        "success": True,
        "count": len(products),
        "products": [
            {
                "id": str(product.id),
                "category_id": str(product.category_id),
                "name": product.name,
                "description": product.description,
                "price": product.price,
                "stock_quantity": product.stock_quantity,
            }
            for product in products
        ],
    }


@router.get("/products/{product_id}")
def get_product(
    product_id: UUID,
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    return {
        "success": True,
        "product": {
            "id": str(product.id),
            "category_id": str(product.category_id),
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "stock_quantity": product.stock_quantity,
        },
    }


# ---------------------------------------------------------
# CART HELPERS
# ---------------------------------------------------------

def get_or_create_cart(
    db: Session,
    current_user: User,
) -> Cart:
    cart = (
        db.query(Cart)
        .filter(
            Cart.user_id == current_user.id
        )
        .first()
    )

    if cart:
        return cart

    cart = Cart(
        user_id=current_user.id,
    )

    db.add(cart)
    db.commit()
    db.refresh(cart)

    return cart


def build_cart_response(
    db: Session,
    cart: Cart,
):
    items = (
        db.query(CartItem)
        .filter(
            CartItem.cart_id == cart.id
        )
        .all()
    )

    cart_items = []
    total_items = 0
    total_amount = 0.0

    for item in items:
        product = (
            db.query(Product)
            .filter(
                Product.id == item.product_id
            )
            .first()
        )

        if not product:
            continue

        subtotal = (
            product.price
            * item.quantity
        )

        total_items += item.quantity
        total_amount += subtotal

        cart_items.append(
            {
                "id": str(item.id),
                "product_id": str(product.id),
                "product_name": product.name,
                "quantity": item.quantity,
                "unit_price": product.price,
                "subtotal": round(
                    subtotal,
                    2,
                ),
            }
        )

    return {
        "id": str(cart.id),
        "items": cart_items,
        "total_items": total_items,
        "total_amount": round(
            total_amount,
            2,
        ),
    }


# ---------------------------------------------------------
# GET CART
# ---------------------------------------------------------

@router.get("/cart")
def get_cart(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    cart = get_or_create_cart(
        db,
        current_user,
    )

    return {
        "success": True,
        "cart": build_cart_response(
            db,
            cart,
        ),
    }


# ---------------------------------------------------------
# ADD TO CART
# ---------------------------------------------------------

@router.post("/cart/items")
def add_to_cart(
    product_id: UUID,
    quantity: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    if quantity < 1:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be at least 1",
        )

    product = (
        db.query(Product)
        .filter(
            Product.id == product_id
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    if product.stock_quantity < quantity:
        raise HTTPException(
            status_code=400,
            detail="Insufficient product stock",
        )

    cart = get_or_create_cart(
        db,
        current_user,
    )

    existing_item = (
        db.query(CartItem)
        .filter(
            CartItem.cart_id == cart.id,
            CartItem.product_id == product.id,
        )
        .first()
    )

    if existing_item:
        new_quantity = (
            existing_item.quantity
            + quantity
        )

        if new_quantity > product.stock_quantity:
            raise HTTPException(
                status_code=400,
                detail="Requested quantity exceeds stock",
            )

        existing_item.quantity = new_quantity

    else:
        item = CartItem(
            cart_id=cart.id,
            product_id=product.id,
            quantity=quantity,
        )

        db.add(item)

    db.commit()

    return {
        "success": True,
        "message": "Product added to cart",
        "cart": build_cart_response(
            db,
            cart,
        ),
    }


# ---------------------------------------------------------
# UPDATE QUANTITY
# ---------------------------------------------------------

@router.patch("/cart/items/{item_id}")
def update_cart_item(
    item_id: UUID,
    quantity: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    if quantity < 1:
        raise HTTPException(
            status_code=400,
            detail="Quantity must be at least 1",
        )

    cart = get_or_create_cart(
        db,
        current_user,
    )

    item = (
        db.query(CartItem)
        .filter(
            CartItem.id == item_id,
            CartItem.cart_id == cart.id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Cart item not found",
        )

    product = (
        db.query(Product)
        .filter(
            Product.id == item.product_id
        )
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found",
        )

    if quantity > product.stock_quantity:
        raise HTTPException(
            status_code=400,
            detail="Requested quantity exceeds stock",
        )

    item.quantity = quantity

    db.commit()

    return {
        "success": True,
        "message": "Cart quantity updated",
        "cart": build_cart_response(
            db,
            cart,
        ),
    }


# ---------------------------------------------------------
# REMOVE CART ITEM
# ---------------------------------------------------------

@router.delete("/cart/items/{item_id}")
def remove_cart_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    cart = get_or_create_cart(
        db,
        current_user,
    )

    item = (
        db.query(CartItem)
        .filter(
            CartItem.id == item_id,
            CartItem.cart_id == cart.id,
        )
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Cart item not found",
        )

    db.delete(item)
    db.commit()

    return {
        "success": True,
        "message": "Product removed from cart",
        "cart": build_cart_response(
            db,
            cart,
        ),
    }


# ---------------------------------------------------------
# CHECKOUT
# ---------------------------------------------------------

@router.post("/checkout")
def checkout(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    cart = get_or_create_cart(
        db,
        current_user,
    )

    cart_items = (
        db.query(CartItem)
        .filter(
            CartItem.cart_id == cart.id
        )
        .all()
    )

    if not cart_items:
        raise HTTPException(
            status_code=400,
            detail="Cart is empty",
        )

    total_amount = 0.0
    order_products = []

    for item in cart_items:
        product = (
            db.query(Product)
            .filter(
                Product.id == item.product_id
            )
            .first()
        )

        if not product:
            raise HTTPException(
                status_code=404,
                detail="Product not found",
            )

        if item.quantity > product.stock_quantity:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Insufficient stock for "
                    f"{product.name}"
                ),
            )

        subtotal = (
            product.price
            * item.quantity
        )

        total_amount += subtotal

        order_products.append(
            (
                item,
                product,
            )
        )

    order = StoreOrder(
        user_id=current_user.id,
        total_amount=round(
            total_amount,
            2,
        ),
        status="pending",
    )

    db.add(order)
    db.flush()

    for item, product in order_products:
        order_item = StoreOrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=item.quantity,
            unit_price=product.price,
        )

        product.stock_quantity -= item.quantity

        db.add(order_item)

    for item in cart_items:
        db.delete(item)

    db.commit()
    db.refresh(order)

    return {
        "success": True,
        "message": "Store order created successfully",
        "order": {
            "id": str(order.id),
            "total_amount": order.total_amount,
            "status": order.status,
            "created_at": order.created_at,
        },
    }


# ---------------------------------------------------------
# AI SEED RECOMMENDATION
# ---------------------------------------------------------

@router.get("/ai/seed-recommendation")
def recommend_seed(
    crop: str,
    soil_type: str,
    season: str,
    location: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_farmer),
):
    seed_category = (
        db.query(ProductCategory)
        .filter(
            ProductCategory.name.ilike("Seeds")
        )
        .first()
    )

    if not seed_category:
        return {
            "success": True,
            "title": "AGRIVA AI Recommended Seeds",
            "recommendations": [],
        }

    products = (
        db.query(Product)
        .filter(
            Product.category_id
            == seed_category.id
        )
        .all()
    )

    recommendations = []

    for product in products:
        text = (
            f"{product.name} "
            f"{product.description or ''}"
        ).lower()

        score = 60.0
        reasons = []

        if crop.lower() in text:
            score += 20
            reasons.append(
                f"Suitable for {crop}"
            )

        if soil_type.lower() in text:
            score += 8
            reasons.append(
                f"Suitable for {soil_type} soil"
            )

        if season.lower() in text:
            score += 7
            reasons.append(
                f"Suitable for {season} season"
            )

        if location.lower() in text:
            score += 5
            reasons.append(
                f"Suitable for {location}"
            )

        score = min(
            score,
            99.0,
        )

        recommendations.append(
            {
                "product_id": str(product.id),
                "name": product.name,
                "price": product.price,
                "stock_quantity": product.stock_quantity,
                "suitability_percentage": round(
                    score,
                    1,
                ),
                "reason": (
                    ", ".join(reasons)
                    if reasons
                    else
                    "Recommended based on AGRIVA Store availability"
                ),
            }
        )

    recommendations.sort(
        key=lambda item: item[
            "suitability_percentage"
        ],
        reverse=True,
    )

    return {
        "success": True,
        "title": "AGRIVA AI Recommended Seeds",
        "crop": crop,
        "soil_type": soil_type,
        "season": season,
        "location": location,
        "recommendations": recommendations[:5],
    }