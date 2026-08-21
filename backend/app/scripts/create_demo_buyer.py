from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.market import Buyer
from app.models.user import BuyerProfile, User


def create_demo_buyer() -> None:
    db = SessionLocal()

    try:
        user = (
            db.query(User)
            .filter(
                User.email == "buyer@agriva.demo"
            )
            .first()
        )

        if user is None:
            user = User(
                full_name="AGRIVA Demo Buyer",
                email="buyer@agriva.demo",
                phone="9000000002",
                password_hash=hash_password(
                    "Buyer@123"
                ),
                role="BUYER",
                is_active=True,
            )

            db.add(user)
            db.commit()
            db.refresh(user)

            print(
                "Created BUYER user:",
                user.id,
            )
        else:
            print(
                "BUYER user already exists:",
                user.id,
            )

        profile = (
            db.query(BuyerProfile)
            .filter(
                BuyerProfile.user_id
                == user.id
            )
            .first()
        )

        if profile is None:
            profile = BuyerProfile(
                user_id=user.id,
                business_name=(
                    "Prayagraj Agro Buyers"
                ),
                business_type="Wholesaler",
                city="Prayagraj",
                state="Uttar Pradesh",
            )

            db.add(profile)
            db.commit()
            db.refresh(profile)

            print(
                "Created BuyerProfile:",
                profile.id,
            )
        else:
            print(
                "BuyerProfile already exists:",
                profile.id,
            )

        buyer = (
            db.query(Buyer)
            .filter(
                Buyer.buyer_profile_id
                == profile.id
            )
            .first()
        )

        if buyer is None:
            buyer = Buyer(
                buyer_profile_id=profile.id,
                preferred_crop="Wheat",
                city="Prayagraj",
                state="Uttar Pradesh",

                demand_quantity_kg=450,

                offer_price_per_kg=27.5,

                preferred_quality="A",

                rating=4.6,

                distance_km=12.0,
            )

            db.add(buyer)
            db.commit()
            db.refresh(buyer)

            print(
                "Created Buyer:",
                buyer.id,
            )
        else:
            print(
                "Buyer already exists:",
                buyer.id,
            )

        print()
        print("Demo Buyer Login")
        print("----------------")
        print(
            "Email: buyer@agriva.demo"
        )
        print(
            "Password: Buyer@123"
        )

    finally:
        db.close()


if __name__ == "__main__":
    create_demo_buyer()