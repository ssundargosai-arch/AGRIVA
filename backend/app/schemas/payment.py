from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PaymentCreate(BaseModel):
    order_id: UUID
    payment_method: str


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    payment_id: UUID
    transaction_reference: str
    amount: float
    status: str
    created_at: datetime


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    order_id: UUID
    amount: float
    payment_method: str
    status: str
    transaction: TransactionResponse | None = None


class PaymentStatusUpdate(BaseModel):
    status: str