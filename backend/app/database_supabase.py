import httpx
from typing import Optional, List, Dict, Any
from app.core.config import settings


class SupabaseClient:
    """Cliente para la REST API de Supabase."""
    
    def __init__(self):
        self.base_url = settings.SUPABASE_URL
        self.api_key = settings.SUPABASE_SERVICE_KEY
        self.headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    async def _request(self, method: str, table: str, **kwargs) -> Any:
        url = f"{self.base_url}/rest/v1/{table}"
        params = kwargs.get("params", {})
        json_data = kwargs.get("json")
        headers = {**self.headers, **kwargs.get("headers", {})}
        
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=json_data
            )
            response.raise_for_status()
            return response.json() if response.content else None
    
    async def select(self, table: str, columns: str = "*", filters: Dict = None) -> List[Dict]:
        params = {"select": columns}
        if filters:
            for key, value in filters.items():
                # Si el valor ya tiene el formato "eq.", usarlo directamente
                if isinstance(value, str) and value.startswith("eq."):
                    params[key] = value
                else:
                    params[key] = f"eq.{value}"
        return await self._request("GET", table, params=params)
    
    async def select_one(self, table: str, columns: str = "*", filters: Dict = None) -> Optional[Dict]:
        results = await self.select(table, columns, filters)
        return results[0] if results else None
    
    async def insert(self, table: str, data: Dict) -> Dict:
        return await self._request("POST", table, json=data)
    
    async def update(self, table: str, data: Dict, filters: Dict) -> List[Dict]:
        params = {}
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        return await self._request("PATCH", table, json=data, params=params)
    
    async def delete(self, table: str, filters: Dict) -> List[Dict]:
        params = {}
        for key, value in filters.items():
            params[key] = f"eq.{value}"
        return await self._request("DELETE", table, params=params)


# Instancia global
supabase_client = SupabaseClient()
