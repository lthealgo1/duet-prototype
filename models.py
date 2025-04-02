from sqlalchemy.sql.expression import text
from database import Base
from sqlalchemy.sql.sqltypes import TIMESTAMP
from sqlalchemy import Column, Integer, Boolean
# every model is a table in our db


class Productivity(Base):
    __tablename__ = "productivity"

    id = Column(Integer, primary_key=True, nullable=False)
    TechDebt = Column(Integer, nullable=False)
    Maintenance = Column(Integer, nullable=False)
    Rnd = Column(Integer, nullable=False)
    Testing = Column(Integer, nullable=False)
    BugFixing = Column(Integer, nullable=False)
    haveCommercialData = Column(Boolean, server_default="False", nullable=False)
    created_at = Column(TIMESTAMP(timezone=True),nullable=False, server_default=text('now()'))