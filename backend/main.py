from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import pandas as pd
from io import BytesIO
import os

from database import engine, get_db, Base
import models
from services import process_uploaded_file

# Initialize DB
Base.metadata.create_all(bind=engine)

app = FastAPI(title="OdInventario API", root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Odinventario Backend Running"}

@app.get("/items")
def get_items(db: Session = Depends(get_db)):
    items = db.query(models.Item).all()
    return items

@app.post("/items/upload")
async def upload_inventory_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    filename = file.filename
    
    # In a real heavy-load scenario, we would use Celery here.
    # For now, we use FastAPI's BackgroundTasks for immediate processing.
    background_tasks.add_task(process_uploaded_file, contents, filename, db)
    
    return {"message": f"Archivo {filename} recibido. Procesamiento en segundo plano iniciado."}
