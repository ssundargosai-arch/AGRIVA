from enum import Enum

from pydantic import BaseModel, EmailStr, Field
import uuid
from pydantic import ConfigDict


class UserRole(str, Enum):
    FARMER = "FARMER"
    BUYER = "BUYER"
    ADMIN = "ADMIN"


class FarmerRegister(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=8)

    state: str
    district: str
    village: str

    farm_size: float = Field(gt=0)
    farming_type: str


class BuyerRegister(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=8)

    business_name: str
    business_type: str
    buying_capacity: float = Field(gt=0)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# class UserResponse(BaseModel):
#     id: int
#     name: str
#     email: EmailStr
#     phone: str
#     role: UserRole

#     model_config = {
#         "from_attributes": True
#     }
class UserResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: str
    role: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)