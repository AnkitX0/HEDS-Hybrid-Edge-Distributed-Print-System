import uuid
from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.modules.users.models import User, UserRole
from app.modules.agents.models import Agent
from app.modules.tenants.models import ShopMember

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not token:
        raise UnauthorizedException("Authentication token required")
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedException("Invalid or expired token")

    user_id = payload["sub"]
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise UnauthorizedException("User not found or disabled")
    return user


async def require_shop_operator(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in [UserRole.SHOP_OPERATOR, UserRole.SHOP_ADMIN, UserRole.PLATFORM_ADMIN]:
        raise ForbiddenException("Operator or Admin access required")
    return current_user


async def require_shop_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in [UserRole.SHOP_ADMIN, UserRole.PLATFORM_ADMIN]:
        raise ForbiddenException("Shop Admin access required")
    return current_user


async def verify_agent(
    x_agent_id: Optional[str] = Header(None),
    x_agent_key: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Agent:
    if not x_agent_id or not x_agent_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Agent-ID and X-Agent-Key headers required",
        )
    try:
        agent_uuid = uuid.UUID(x_agent_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Agent ID format")

    result = await db.execute(select(Agent).where(Agent.id == agent_uuid))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Agent not registered")

    from app.modules.agents.service import AgentService
    if agent.agent_token_hash != AgentService.hash_agent_token(x_agent_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Agent credentials")

    return agent
