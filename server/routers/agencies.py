from fastapi import APIRouter
from pydantic import BaseModel, Field

from services import agencies

router = APIRouter(prefix="/api/agencies", tags=["agencies"])


class AgencyIn(BaseModel):
    id: int
    site: str = Field(min_length=1)
    name: str = Field(min_length=1)


@router.get("")
def list_agencies():
    return agencies.get_agencies()


@router.post("")
def create_agency(agency: AgencyIn):
    return agencies.add_agency(
        {"id": agency.id, "site": agency.site.strip(), "name": agency.name.strip()}
    )


@router.delete("/{agency_id}")
def delete_agency(agency_id: int):
    return agencies.remove_agency(agency_id)
