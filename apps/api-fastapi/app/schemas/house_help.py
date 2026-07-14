from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HouseHelpResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    name: str
    phone: str | None = None
    type: str
    photo_url: str | None = Field(default=None, alias="photoUrl")
    id_proof_type: str | None = Field(default=None, alias="idProofType")
    id_proof_number: str | None = Field(default=None, alias="idProofNumber")
    id_proof_url: str | None = Field(default=None, alias="idProofUrl")
    id_verified: bool = Field(alias="idVerified")
    background_check: str = Field(alias="backgroundCheck")
    incident_count: int = Field(alias="incidentCount")
    is_active: bool = Field(alias="isActive")
    registered_by: str | None = Field(default=None, alias="registeredBy")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    updated_at: datetime | None = Field(default=None, alias="updatedAt")
    rating_avg: float | None = Field(default=None, alias="ratingAvg")
    review_count: int | None = Field(default=None, alias="reviewCount")
    trust_score: int | None = Field(default=None, alias="trustScore")
    verification_level: str | None = Field(default=None, alias="verificationLevel")


class CreateHouseHelpRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    phone: str | None = None
    type: str = "OTHER"
    photo_url: str | None = Field(default=None, alias="photoUrl")
    id_proof_type: str | None = Field(default=None, alias="idProofType")
    id_proof_number: str | None = Field(default=None, alias="idProofNumber")
    id_proof_url: str | None = Field(default=None, alias="idProofUrl")


class UpdateHouseHelpRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    phone: str | None = None
    type: str | None = None
    photo_url: str | None = Field(default=None, alias="photoUrl")
    id_proof_type: str | None = Field(default=None, alias="idProofType")
    id_proof_number: str | None = Field(default=None, alias="idProofNumber")
    id_proof_url: str | None = Field(default=None, alias="idProofUrl")
    is_active: bool | None = Field(default=None, alias="isActive")


class UpdateVerificationRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id_verified: bool | None = Field(default=None, alias="idVerified")
    background_check: str | None = Field(default=None, alias="backgroundCheck")
    incident_count: int | None = Field(default=None, alias="incidentCount")


class HouseHelpReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    house_help_id: str = Field(alias="houseHelpId")
    rating: int
    comment: str | None = None
    created_at: datetime | None = Field(default=None, alias="createdAt")


class CreateHouseHelpReviewRequest(BaseModel):
    rating: int
    comment: str | None = None


class HouseHelpReviewSummary(BaseModel):
    average: float | None
    count: int
    trust_score: int = Field(alias="trustScore")

    model_config = ConfigDict(populate_by_name=True)


class HouseHelpReviewsView(BaseModel):
    reviews: list[HouseHelpReviewResponse]
    summary: HouseHelpReviewSummary


class HouseHelpAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    house_help_id: str = Field(alias="houseHelpId")
    apartment_id: str = Field(alias="apartmentId")
    assigned_by: str | None = Field(default=None, alias="assignedBy")
    created_at: datetime | None = Field(default=None, alias="createdAt")


class CreateHouseHelpAssignmentRequest(BaseModel):
    apartment_id: str = Field(alias="apartmentId")

    model_config = ConfigDict(populate_by_name=True)


class HouseHelpEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    house_help_id: str = Field(alias="houseHelpId")
    apartment_id: str | None = Field(default=None, alias="apartmentId")
    check_in_at: datetime | None = Field(default=None, alias="checkInAt")
    check_in_by: str | None = Field(default=None, alias="checkInBy")
    check_out_at: datetime | None = Field(default=None, alias="checkOutAt")
    check_out_by: str | None = Field(default=None, alias="checkOutBy")
    created_at: datetime | None = Field(default=None, alias="createdAt")
    help_name: str | None = Field(default=None, alias="helpName")
    type: str | None = None
    apartment: str | None = None


class CheckInHouseHelpRequest(BaseModel):
    apartment_id: str | None = Field(default=None, alias="apartmentId")

    model_config = ConfigDict(populate_by_name=True)
