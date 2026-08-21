from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

from app.db import Base
from app.core.config import get_settings

# Import all models so SQLAlchemy metadata knows about them.
from app.models import (
    User,
    FarmerProfile,
    BuyerProfile,
    Farm,
    FarmField,
    SoilReport,
    SoilAnalysis,
    Crop,
    CropImage,
    CropHealth,
    CropQualityPrediction,
    PricePrediction,
    CropRecommendation,
    CropFarmPlan,
    CropCalendar,
    CropListing,
    Buyer,
    BuyerMatch,
    Order,
    OrderItem,
    ProductCategory,
    Product,
    Cart,
    CartItem,
    StoreOrder,
    StoreOrderItem,
    Payment,
    Transaction,
    TransportBooking,
    WeatherAlert,
    Advisory,
    Notification,
    Review,
    Analytics,
)

config = context.config

settings = get_settings()

# Use the application's database URL.
config.set_main_option(
    "sqlalchemy.url",
    settings.database_url.replace("%", "%%"),
)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named",
        },
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()