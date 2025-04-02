from fastapi import FastAPI, Response, status, HTTPException, Depends
from fastapi.params import Body
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import time
from sqlalchemy.orm import Session
import models
from database import get_db, engine
from mangum import Mangum
from typing import Dict, Any


models.Base.metadata.create_all(bind=engine)

app = FastAPI()
handler = Mangum(app)


# we want the requests to have a certain schema.
class Post(BaseModel):
    BugFixing: int = None
    TechDebt: int = None
    Maintenance: int = None
    Rnd: int = None
    Testing: int = None
    haveCommercialData: bool = False
    id: int = None


while True:
    try:
        conn = psycopg2.connect(host='localhost', database='plsssssss',
                                user='postgres', port='5433', password='Asa1738_', cursor_factory=RealDictCursor)
        cursor = conn.cursor()
        print('Database connection was successful.')
        break

    except Exception as error:
        print('Connection to database failed')
        print('Error:', error)
        time.sleep(3)


@app.get("/")
async def root():  
    return {"message": "Hello World"}


@app.get("/data")
async def get_data(db: Session = Depends(get_db)):
    # cursor.execute("""SELECT * FROM productivity ORDER BY id ASC""")
    # stats = cursor.fetchall()
    # print(stats)
    data = db.query(models.Productivity).all()
    return {"data": data}


@app.post("/posts", status_code=status.HTTP_201_CREATED)
async def create_data(data: Post, db: Session = Depends(get_db)):
    # cursor.execute(
    #     """INSERT INTO productivity ("srh bug fixing","srh tech debt","srh maintenance","srh rnd","srh testing","haveCommData") VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""", (data.srhBugFixing, data.srhTechDebt, data.srhMaintenance, data.srhRnd, data.srhTesting, data.haveCommData))
    # appendedData = cursor.fetchone()
    # conn.commit()

    new_post = models.Productivity(**data.dict())
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return {"data": new_post}



# saved_data = []
# @app.post("/data")
# async def post_data(data: Dict[str, Any]):
#     # Append the received JSON data to the posted_data list
#     saved_data.append(data)
#     # Return the same data back to the client
#     return data
# @app.get("/data")
# async def get_data():
#     # Return all the posted JSON data
#     return saved_data


@app.get("/data/id-{id}")
def get_data(id: str,db: Session = Depends(get_db)):
    # cursor.execute(
    #     """SELECT * from productivity WHERE id = %s""", (str(id),))
    # data = cursor.fetchone()\
    data = db.query(models.Productivity).filter(models.Productivity.id == id).first()
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"post with id: {id} was not found")
    return {'post_detail': data}


@app.delete("/data/id-{id}")
def delete_data(id: int,db: Session = Depends(get_db)):
    # cursor.execute(
    #     """DELETE FROM productivity WHERE id = %s returning *""", (str(id),))
    # response = cursor.fetchone()
    # conn.commit()

    x=db.query(models.Productivity).filter(models.Productivity.id == id)
    if x.first() == None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"post with id: {id} does not exist")
    x.delete(synchronize_session=False)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.put("/data/id-{id}")
def update_data(id: str, post: Post):
    cursor.execute("""UPDATE productivity SET "haveCommData" = %s WHERE id = %s RETURNING *""", (
                   str(post.haveCommercialData).capitalize(), str(id),))
    updated_post = cursor.fetchone()
    conn.commit()
    if updated_post == None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"post with id: {id} does not exist")
    return {'data': updated_post}


@app.get("/sqlalchemy")
def test_post(db: Session = Depends(get_db)):

    data = db.query(models.Productivity).all()
    
    p = db.query(models.Productivity)
    print(p)
    return {"data": data}

