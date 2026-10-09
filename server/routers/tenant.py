import os

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
    path = os.path.join(tenant.LOGO_DIR, safe)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="No such logo")
    return FileResponse(path)
