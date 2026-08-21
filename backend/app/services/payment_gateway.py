import os
import uuid
from dataclasses import dataclass


DEMO_MODE = (
    os.getenv(
        "DEMO_MODE",
        "true",
    ).lower()
    == "true"
)


@dataclass
class PaymentGatewayResult:
    success: bool
    reference: str
    status: str
    message: str


class PaymentGateway:
    SUPPORTED_METHODS = {
        "upi",
        "card",
        "netbanking",
        "wallet",
    }

    @classmethod
    def process(
        cls,
        *,
        amount: float,
        payment_method: str,
    ) -> PaymentGatewayResult:

        method = (
            payment_method
            .strip()
            .lower()
        )

        if method not in cls.SUPPORTED_METHODS:
            return PaymentGatewayResult(
                success=False,
                reference="",
                status="failed",
                message=(
                    "Unsupported payment method"
                ),
            )

        if amount <= 0:
            return PaymentGatewayResult(
                success=False,
                reference="",
                status="failed",
                message="Invalid amount",
            )

        if DEMO_MODE:
            reference = (
                "AGRIVA-DEMO-"
                + uuid.uuid4().hex.upper()
            )

            return PaymentGatewayResult(
                success=True,
                reference=reference,
                status="completed",
                message=(
                    "Demo payment completed"
                ),
            )

        # Real provider integration later.
        return PaymentGatewayResult(
            success=False,
            reference="",
            status="failed",
            message=(
                "Production gateway "
                "is not configured"
            ),
        )