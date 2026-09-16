from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

# JSONB on Postgres, plain JSON elsewhere (sqlite in tests)
JSONType = JSON().with_variant(JSONB(), "postgresql")
