from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from security import decode_token
from typing import Optional

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Query(None)
):
    jwt_token = credentials.credentials if credentials else token
    if not jwt_token:
        raise HTTPException(status_code=401, detail="Authentication required")

    payload = decode_token(jwt_token)
    return payload