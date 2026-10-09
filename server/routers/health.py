from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health():
    """Liveness probe for the container healthcheck; touches nothing external."""
    return {"status": "ok"}
