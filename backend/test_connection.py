
from sqlalchemy import create_engine, text
from app.core.config import settings


print("Connecting to PostgreSQL...")

try:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"connect_timeout": 5},
    )

    with engine.connect() as connection:

        result = connection.execute(
            text("SELECT current_database(), current_user")
        ).fetchone()

        print("Database connection successful!")
        print("Database:", result[0])
        print("User:", result[1])

        vector_version = connection.execute(
            text(
                "SELECT extversion FROM pg_extension "
                "WHERE extname = 'vector'"
            )
        ).scalar()

        print("pgvector version:", vector_version)

except Exception as error:
    print("Database connection failed!")
    print("Error type:", type(error).__name__)
    print("Error:", error)

finally:
    if "engine" in locals():
        engine.dispose()
