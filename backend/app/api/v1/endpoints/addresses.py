"""
app/api/v1/endpoints/addresses.py
-----------------------------------
Saved address book:
  GET    /addresses           — List user's addresses
  POST   /addresses           — Add address
  PUT    /addresses/{id}      — Update address
  DELETE /addresses/{id}      — Delete address
  PATCH  /addresses/{id}/default — Set as default
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, update

from app.core.dependencies import CurrentUser, DBSession
from app.models.address import Address

router = APIRouter(prefix="/addresses", tags=["Addresses"])


class AddressRequest(BaseModel):
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: str = "India"
    is_default: bool = False


class AddressOut(BaseModel):
    id: int
    full_name: str
    phone: str
    line1: str
    line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: str
    is_default: bool

    model_config = {"from_attributes": True}


@router.get("", response_model=list[AddressOut])
async def list_addresses(current_user: CurrentUser, db: DBSession):
    result = await db.execute(
        select(Address)
        .where(Address.user_id == current_user.id)
        .order_by(Address.is_default.desc(), Address.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=AddressOut, status_code=status.HTTP_201_CREATED)
async def add_address(
    payload: AddressRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    if payload.is_default:
        # Unset existing default
        await db.execute(
            update(Address)
            .where(Address.user_id == current_user.id)
            .values(is_default=False)
        )

    address = Address(user_id=current_user.id, **payload.model_dump())
    db.add(address)
    await db.flush()
    return address


@router.put("/{address_id}", response_model=AddressOut)
async def update_address(
    address_id: int,
    payload: AddressRequest,
    current_user: CurrentUser,
    db: DBSession,
):
    address = await _get_own_address(address_id, current_user.id, db)

    if payload.is_default and not address.is_default:
        await db.execute(
            update(Address)
            .where(Address.user_id == current_user.id)
            .values(is_default=False)
        )

    for field, value in payload.model_dump().items():
        setattr(address, field, value)
    await db.flush()
    return address


@router.delete("/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_address(
    address_id: int,
    current_user: CurrentUser,
    db: DBSession,
):
    address = await _get_own_address(address_id, current_user.id, db)
    await db.delete(address)


@router.patch("/{address_id}/default", response_model=AddressOut)
async def set_default_address(
    address_id: int,
    current_user: CurrentUser,
    db: DBSession,
):
    # Clear existing default
    await db.execute(
        update(Address)
        .where(Address.user_id == current_user.id)
        .values(is_default=False)
    )
    address = await _get_own_address(address_id, current_user.id, db)
    address.is_default = True
    await db.flush()
    return address


async def _get_own_address(address_id: int, user_id: int, db: DBSession) -> Address:
    result = await db.execute(
        select(Address).where(Address.id == address_id, Address.user_id == user_id)
    )
    address = result.scalar_one_or_none()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    return address
