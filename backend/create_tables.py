import asyncio
from app.db.session import engine, Base
from app.db import base  # registers all models

async def create():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Tables recreated successfully.")

asyncio.run(create())
