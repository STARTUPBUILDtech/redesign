from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email address or WhatsApp phone number")
    password: str = Field(..., min_length=1, description="User password")
    turnstile_token: Optional[str] = Field(None, description="Cloudflare Turnstile token if challenge required")
    device_id: Optional[str] = Field(None, description="Optional client device identifier")


class RegisterRequest(BaseModel):
    phone: str = Field(..., description="WhatsApp phone number or phone")
    password: str = Field(..., min_length=6, description="User password")
    email: Optional[str] = Field(None, description="User email address")
    full_name: Optional[str] = Field(None, description="Full name")
    username: Optional[str] = Field(None, description="Username")


class OTPVerifyRequest(BaseModel):
    user_id: str = Field(..., description="User ID received during login step 1")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit WhatsApp OTP code")


class BindEmailRequest(BaseModel):
    email: str = Field(..., description="Email address to bind to account")
    user_id: Optional[str] = Field(None, description="User ID if known")
    phone: Optional[str] = Field(None, description="Phone number if user_id is not provided")


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: Optional[str] = None
    whatsapp_number: Optional[str] = None
    full_name: Optional[str] = None
    username: Optional[str] = None
    is_verified: bool
    last_login_at: Optional[datetime] = None


class LoginResponse(BaseModel):
    status: str  # "success" or "otp_required"
    message: str
    otp_required: bool = False
    user: Optional[UserOut] = None
    user_id: Optional[str] = None
    turnstile_required: bool = False


class TokenRefreshResponse(BaseModel):
    status: str = "success"
    message: str = "Tokens refreshed successfully"


class MessageResponse(BaseModel):
    status: str = "success"
    message: str
