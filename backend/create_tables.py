
from app.database.base import Base
from app.database.connection import engine

import app.database.models


def create_tables():
    Base.metadata.create_all(bind=engine)
    print("Connect-Ai database tables created successfully!")


if __name__ == "__main__":
    create_tables()
