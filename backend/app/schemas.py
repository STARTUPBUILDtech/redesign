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
    avatar_color: Optional[str] = Field(None, description="Avatar fill color hex")


class OTPVerifyRequest(BaseModel):
    user_id: str = Field(..., description="User ID received during login step 1")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit WhatsApp OTP code")


class BindEmailRequest(BaseModel):
    email: str = Field(..., description="Email address to bind to account")
    user_id: Optional[str] = Field(None, description="User ID if known")
    phone: Optional[str] = Field(None, description="Phone number if user_id is not provided")
    password: Optional[str] = Field(None, description="Optional new password to set for email login")
    otp: Optional[str] = Field(None, description="Optional verification OTP code")


class SendEmailOtpRequest(BaseModel):
    email: str = Field(..., description="Email address to send verification code to")



class ResetPasswordRequest(BaseModel):
    identifier: str = Field(..., description="Email address or WhatsApp phone number")
    new_password: str = Field(..., min_length=6, description="New password")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=6, description="New password")


class DeleteAccountRequest(BaseModel):
    password: str = Field(..., min_length=1, description="Password confirmation to delete account")


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: Optional[str] = Field(None, min_length=3, max_length=50, description="Username")
    full_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Full name")
    avatar_color: Optional[str] = Field(None, max_length=32, description="Avatar hex or color identifier")
    avatar_url: Optional[str] = Field(None, max_length=1000, description="Avatar image URL")



class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: Optional[str] = None
    whatsapp_number: Optional[str] = None
    full_name: Optional[str] = None
    username: Optional[str] = None
    avatar_color: Optional[str] = None
    avatar_url: Optional[str] = None
    wallet_balance_kobo: Optional[int] = 0
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


class CsrfResponse(BaseModel):
    status: str = "success"
    message: str = "CSRF cookie initialized"
    csrf_token: str


class PayoutAccountCreate(BaseModel):
    bank: str = Field(..., description="Bank name, e.g. Kuda Bank")
    bank_code: Optional[str] = Field("kuda", description="Bank code identifier")
    account_number: str = Field(..., min_length=10, max_length=10, description="10-digit NUBAN account number")
    account_name: str = Field(..., description="Resolved account owner name")
    is_default: bool = Field(False, description="Whether this is the primary payout account")


class PayoutAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    bank: str
    bank_code: str
    account_number: str
    account_name: str
    is_default: bool
    created_at: datetime


# ══════════════════════════════════════════════════════════════
# FINANCIAL & WALLET SCHEMAS
# ══════════════════════════════════════════════════════════════

class WalletBalanceOut(BaseModel):
    wallet_balance_kobo: int = Field(..., description="Available balance in kobo")
    wallet_balance_naira: float = Field(..., description="Available balance in Naira")
    formatted: str = Field(..., description="Formatted Naira currency string, e.g. ₦15,000.00")


class WithdrawRequest(BaseModel):
    amount_kobo: int = Field(..., gt=0, description="Amount to withdraw in kobo (base unit)")
    account_id: str = Field(..., description="UUID of user's registered PayoutAccount")
    pin: Optional[str] = Field(None, description="Optional security PIN or confirmation token")


class WithdrawResponse(BaseModel):
    status: str = "pending"
    message: str
    tx_ref: str
    amount_kobo: int
    fee_kobo: int = 0
    net_payout_kobo: int
    new_balance_kobo: int


class ReleaseEscrowResponse(BaseModel):
    status: str = "completed"
    order_number: str
    message: str
    amount_kobo: int
    fee_kobo: int
    seller_credit_kobo: int
    released_to: str


class RefundEscrowResponse(BaseModel):
    status: str = "refunded"
    order_number: str
    message: str
    amount_kobo: int
    refunded_to: str


class DisputeResolutionRequest(BaseModel):
    outcome: str = Field(..., description="Either 'release_to_seller' or 'refund_to_buyer'")
    reason: str = Field(..., min_length=5, description="Administrative audit justification")


