import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class AgentSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    HEDS_CLOUD_URL: str = "http://localhost:8000"
    HEDS_AGENT_KEY: str = "agent-dev-key-12345"
    HEDS_AGENT_ID: str = "467674bf-343b-4484-adde-efc923c87db3"
    HEDS_SHOP_ID: str = "b52a6ecb-5dbc-4e41-a8cb-88f05f68859a"

    SQLITE_PATH: str = "local_queue.db"
    POLL_INTERVAL_SECONDS: float = 3.0
    HEARTBEAT_INTERVAL_SECONDS: float = 10.0

    HEDS_PRINTER_ADAPTER: str = "mock"  # "mock" or "cups"
    MOCK_PRINTER_PAGES_PER_SECOND: float = 2.0
    MOCK_PRINTER_FAILURE_RATE: float = 0.0


agent_settings = AgentSettings()
