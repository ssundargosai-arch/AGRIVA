from app.db.session import SessionLocal
from app.models.market import Buyer
from app.models.user import BuyerProfile

db = SessionLocal()

try:
    buyer = db.query(Buyer).first()

    if buyer is None:
        profile = db.query(BuyerProfile).first()

        if profile is None:
            raise RuntimeError(
                "No BuyerProfile exists. Register/login a buyer account first."
            )

        buyer = Buyer(
            buyer_profile_id=profile.id,
            preferred_crop="Maize",
            city="Nashik",
            state="Maharashtra",
            demand_quantity_kg=25.0,
            offer_price_per_kg=26.0,
            preferred_quality="A",
            rating=4.5,
            distance_km=18.0,
        )
        db.add(buyer)

    else:
        buyer.preferred_crop = "Maize"
        buyer.city = "Nashik"
        buyer.state = "Maharashtra"
        buyer.demand_quantity_kg = 25.0
        buyer.offer_price_per_kg = 26.0
        buyer.preferred_quality = "A"
        buyer.rating = 4.5
        buyer.distance_km = 18.0

    db.commit()
    db.refresh(buyer)

    print("BUYER ID:", buyer.id)
    print("CROP:", buyer.preferred_crop)
    print("DEMAND:", buyer.demand_quantity_kg)
    print("OFFER PRICE:", buyer.offer_price_per_kg)
    print("QUALITY:", buyer.preferred_quality)
    print("CITY:", buyer.city)
    print("STATE:", buyer.state)
    print("DISTANCE:", buyer.distance_km)
    print("RATING:", buyer.rating)

finally:
    db.close()
