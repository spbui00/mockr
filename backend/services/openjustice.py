import httpx
from typing import List, Dict, Any, Optional, AsyncIterator
from config import settings
import json
import asyncio

class OpenJusticeService:
    def __init__(self):
        self.base_url = settings.openjustice_api_url
        self.api_key = settings.openjustice_api_key
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def close(self):
        await self.client.aclose()
    
    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers
    
    async def send_message_to_conversation(
        self,
        conversation_id: Optional[str],
        user_message: str,
        title: Optional[str] = None,
        system_prompt: Optional[str] = None,
        resources: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        try:
            metadata = {}
            if resources and len(resources) > 0:
                metadata["resources"] = resources
                print(f"[OpenJustice] Attaching {len(resources)} resource(s) to message: {[r.get('name') for r in resources]}")
            
            message = {
                "model": "gpt-4o-mini-2024-07-18",
                "role": "user",
                "content": user_message
            }
            
            if metadata:
                message["metadata"] = metadata
            
            messages = [message]
            
            payload = {
                "conversationId": conversation_id,
                "messages": messages,
                "title": title,
                "prompt": system_prompt
            }
            
            print(f"[OpenJustice] Payload: {json.dumps(payload, indent=2)}")
            
            url = f"{self.base_url}/conversation/send-message"
            headers = self._get_headers()
            
            
            max_attempts = 3
            backoff_seconds = 1
            
            for attempt in range(1, max_attempts + 1):
                try:
                    response = await self.client.post(
                        url,
                        headers=headers,
                        json=payload
                    )
                    response.raise_for_status()
                    data = response.json()
                    return data
                except httpx.HTTPStatusError as http_err:
                    status = http_err.response.status_code
                    response_text = http_err.response.text if hasattr(http_err.response, 'text') else 'N/A'
                    
                    if status == 400:
                        print(f"[OpenJustice] 400 Bad Request error: {response_text}")
                        print(f"[OpenJustice] This may be due to malformed message or invalid resources")
                    
                    if status >= 500 and attempt < max_attempts:
                        print(f"[OpenJustice] Temporary error {status}. Retrying in {backoff_seconds}s (attempt {attempt}/{max_attempts})")
                        await asyncio.sleep(backoff_seconds)
                        backoff_seconds *= 2
                        continue
                    raise
        
        except httpx.HTTPError as e:
            resp = getattr(e, "response", None)
            print(f"OpenJustice API error: {e}")
            print(f"Response status: {resp.status_code if resp else 'N/A'}")
            print(f"Response text: {resp.text if resp else 'N/A'}")
            raise Exception(f"Failed to send message: {str(e)}")
    
    async def stream_dialog_flow(
        self,
        dialog_flow_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        execution_id: Optional[str] = None
    ) -> AsyncIterator[Dict[str, Any]]:
        try:
            params = {}
            
            if execution_id:
                params["executionId"] = execution_id
            elif dialog_flow_id and conversation_id:
                params["dialogFlowId"] = dialog_flow_id
                params["conversationId"] = conversation_id
            else:
                print("[OpenJustice] Warning: Need either executionId OR (dialogFlowId + conversationId)")
                if dialog_flow_id:
                    params["dialogFlowId"] = dialog_flow_id
                if conversation_id:
                    params["conversationId"] = conversation_id
            
            url = f"{self.base_url}/nap/stream"
            
            async with self.client.stream(
                "GET",
                url,
            params=params,
                headers=self._get_headers(),
                timeout=120.0
            ) as response:
                response.raise_for_status()
                
                current_event = None
                async for line in response.aiter_lines():
                    line = line.strip()
                    
                    if line.startswith("event:"):
                        current_event = line[6:].strip()
                    
                    elif line.startswith("data:"):
                        data_str = line[5:].strip()
                        try:
                            data = json.loads(data_str)
                            event_obj = {
                                "event": current_event or "message",
                                "data": data
                            }
                            yield event_obj
                        except json.JSONDecodeError:
                            event_obj = {
                                "event": current_event or "message",
                                "data": {"text": data_str}
                            }
                            yield event_obj
                        current_event = None
        
        except httpx.HTTPError as e:
            print(f"OpenJustice NAP stream error: {e}")
            raise Exception(f"Failed to stream dialog flow: {str(e)}")
    
    async def upload_file_to_conversation(
        self,
        file_data: bytes,
        filename: str
    ) -> Dict[str, Any]:
        try:
            files = {"file": (filename, file_data)}
            
            print(f"[OpenJustice] Uploading file: {filename} ({len(file_data)} bytes)")
            
            response = await self.client.post(
                f"{self.base_url}/conversation/resources/upload-file",
                headers={"Authorization": f"Bearer {self.api_key}"},
                files=files
            )
            response.raise_for_status()
            result = response.json()
            
            print(f"[OpenJustice] Upload response: {json.dumps(result, indent=2)}")
            
            return result
        
        except httpx.HTTPError as e:
            print(f"[OpenJustice] File upload error: {e}")
            if hasattr(e, 'response'):
                print(f"[OpenJustice] Response: {e.response.text}")
            raise Exception(f"Failed to upload file: {str(e)}")
    
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

