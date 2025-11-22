import httpx
from typing import List, Dict, Any, Optional
from config import settings

class OpenJusticeService:
    def __init__(self):
        self.base_url = settings.openjustice_api_url
        self.api_key = settings.openjustice_api_key
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def close(self):
        await self.client.aclose()
    
    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers
    
    async def get_jurisdictions(self) -> List[Dict[str, Any]]:
        try:
            response = await self.client.get(
                f"{self.base_url}/jurisdictions",
                headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return [
                {"id": "us", "name": "United States", "code": "US"},
                {"id": "uk", "name": "United Kingdom", "code": "UK"},
                {"id": "ca", "name": "Canada", "code": "CA"},
                {"id": "au", "name": "Australia", "code": "AU"},
            ]
    
    async def get_legal_areas(self, jurisdiction: str) -> List[Dict[str, Any]]:
        try:
            response = await self.client.get(
                f"{self.base_url}/jurisdictions/{jurisdiction}/legal-areas",
                headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return [
                {"id": "criminal", "name": "Criminal Law"},
                {"id": "civil", "name": "Civil Law"},
                {"id": "constitutional", "name": "Constitutional Law"},
                {"id": "administrative", "name": "Administrative Law"},
                {"id": "family", "name": "Family Law"},
                {"id": "commercial", "name": "Commercial Law"},
            ]
    
    async def search_articles(
        self, 
        jurisdiction: str, 
        legal_area: str,
        query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        try:
            params = {"jurisdiction": jurisdiction, "legal_area": legal_area}
            if query:
                params["q"] = query
            
            response = await self.client.get(
                f"{self.base_url}/articles",
                params=params,
                headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return [
                {
                    "id": "article_1",
                    "title": f"{legal_area.title()} - Article 1",
                    "content": "Sample article content",
                    "jurisdiction": jurisdiction
                }
            ]
    
    async def search_case_law(
        self, 
        jurisdiction: str,
        query: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        try:
            params = {"jurisdiction": jurisdiction, "q": query, "limit": limit}
            response = await self.client.get(
                f"{self.base_url}/case-law",
                params=params,
                headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return []
    
    async def get_legal_context(
        self,
        jurisdiction: str,
        legal_areas: List[str],
        case_description: str
    ) -> Dict[str, Any]:
        articles = []
        for area in legal_areas:
            area_articles = await self.search_articles(jurisdiction, area)
            articles.extend(area_articles[:3])
        
        case_law = await self.search_case_law(jurisdiction, case_description, limit=5)
        
        return {
            "jurisdiction": jurisdiction,
            "legal_areas": legal_areas,
            "relevant_articles": articles,
            "relevant_case_law": case_law,
            "summary": f"Legal context for {jurisdiction} in {', '.join(legal_areas)}"
        }

openjustice_service = OpenJusticeService()

