
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.connection import get_db


router = APIRouter(
    prefix="/api/v1/public",
    tags=["Public"],
)


@router.get("/database-health")
def database_health(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1")).scalar()

        vector_version = db.execute(
            text(
                "SELECT extversion FROM pg_extension "
                "WHERE extname = 'vector'"
            )
        ).scalar()

        return {
            "database": "connected" if result == 1 else "unavailable",
            "pgvector": vector_version or "not enabled",
        }

    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database is unavailable",
        )
