from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class OrderTrackingResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID
    order_id: UUID
    status: str
    message: str | None
    created_at: datetime