from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from services import saved_reports

router = APIRouter(prefix="/api/saved-reports", tags=["saved-reports"])


@router.post("")
async def save_report(
    file: UploadFile = File(...),
    agency_name: str = Form(""),
    agency_id: str = Form(""),
    report_type: str = Form(""),
    format: str = Form(""),
    title: str = Form(""),
):
    data = await file.read()
    return saved_reports.save(
        data,
        file.filename or "report",
        {
            "agency_name": agency_name,
            "agency_id": agency_id,
            "report_type": report_type,
            "format": format,
            "title": title,
        },
    )


@router.get("")
def list_saved_reports(
    agency_name: str | None = Query(None), report_type: str | None = Query(None)
):
    return saved_reports.list_reports(agency_name, report_type)


@router.get("/{report_id}/download")
def download_saved_report(report_id: int):
    found = saved_reports.get_file(report_id)
    if not found:
        raise HTTPException(status_code=404, detail="Report not found")
    path, filename = found
    return FileResponse(path, filename=filename)


@router.delete("/{report_id}")
def delete_saved_report(report_id: int):
    return {"deleted": saved_reports.delete(report_id)}
