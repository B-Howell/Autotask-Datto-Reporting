from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from services import tenant

router = APIRouter(prefix="/api/tenant", tags=["tenant"])


@router.get("")
def get_tenant():
    return tenant.get_tenant()


@router.get("/logos/{filename}")
def get_logo(filename: str):
    safe = tenant.safe_filename(filename)
    if safe is None:
        raise HTTPException(status_code=400, detail="Bad filename")
    path = tenant.logo_file(safe)
    if path is None:
        raise HTTPException(status_code=404, detail="No such logo")
    return FileResponse(path)
