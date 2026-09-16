from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    ai_use_embeddings: bool = False
    ai_embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"

    # decision rule (contract): auto-match iff best ≥ threshold AND best − second ≥ margin
    match_threshold: float = 0.88
    match_margin: float = 0.10
    fuzzy_floor: float = 0.50      # below this we don't even suggest


settings = Settings()
