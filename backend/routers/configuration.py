from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from services.openjustice import openjustice_service

router = APIRouter()

@router.get("/jurisdictions")
async def get_jurisdictions() -> List[Dict[str, Any]]:
    try:
        jurisdictions = await openjustice_service.get_jurisdictions()
        return jurisdictions
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/legal-areas/{jurisdiction}")
async def get_legal_areas(jurisdiction: str) -> List[Dict[str, Any]]:
    try:
        legal_areas = await openjustice_service.get_legal_areas(jurisdiction)
        return legal_areas
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/articles")
async def search_articles(
    jurisdiction: str,
    legal_area: str,
    query: str = None
) -> List[Dict[str, Any]]:
    try:
        articles = await openjustice_service.search_articles(
            jurisdiction, legal_area, query
        )
        return articles
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

