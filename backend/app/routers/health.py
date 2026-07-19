from fastapi import APIRouter, Response

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.head("/health")
def health_head() -> Response:
    return Response(status_code=200)
