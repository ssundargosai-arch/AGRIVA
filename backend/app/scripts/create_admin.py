from tokenize import String

from app.db.session import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def create_admin():
    db = SessionLocal()

    try:
        email = "admin@agriva.demo"

        existing = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if existing:
            print("Admin already exists")
            return

        admin = User(
            full_name="AGRIVA Admin",
            email=email,
            phone="9999999999",
            password_hash=hash_password("Admin@123"),
            role="ADMIN",
            is_active=True,
        )

        db.add(admin)
        db.commit()

        print("Admin created successfully")

    finally:
        db.close()


if __name__ == "__main__":
    create_admin()