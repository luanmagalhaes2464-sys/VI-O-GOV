from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_name: str = "VIÇO GOV"
    database_url: str | None = None
    cors_origins: str = "http://localhost:3000"
    admin_api_key: str | None = None
    environment: str = "development"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
