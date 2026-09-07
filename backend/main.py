from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, text
from typing import List, Optional

from database import engine, get_db, Base
import models
import schemas
from services import process_uploaded_file

# Initialize DB tables & run automatic migrations
Base.metadata.create_all(bind=engine)

def auto_migrate():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE items ADD COLUMN IF NOT EXISTS numero_bien_nacional VARCHAR;"))
        conn.execute(text("ALTER TABLE items ADD COLUMN IF NOT EXISTS tipo_articulo VARCHAR;"))
        conn.commit()

try:
    auto_migrate()
except Exception as e:
    print(f"Migration note: {e}")

app = FastAPI(title="OdInventario API")

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

@app.get("/stats")
def get_inventory_stats(db: Session = Depends(get_db)):
    items = db.query(models.Item).all()
    total_items = len(items)
    total_stock = sum(item.cantidad for item in items)
    total_value = sum((item.cantidad * (item.precio_unitario or 0.0)) for item in items)
    low_stock = sum(1 for item in items if item.cantidad <= 3)
    
    # Categories & Types
    categories_set = set(item.categoria for item in items if item.categoria)
    types_set = set(item.tipo_articulo for item in items if item.tipo_articulo)
    bien_nacional_count = sum(1 for item in items if item.numero_bien_nacional)
    
    return {
        "total_items": total_items,
        "total_stock": total_stock,
        "total_value": round(total_value, 2),
        "low_stock": low_stock,
        "categories_count": len(categories_set),
        "categories": sorted(list(categories_set)),
        "tipos": sorted(list(types_set)),
        "bien_nacional_count": bien_nacional_count
    }

@app.get("/items", response_model=List[schemas.ItemResponse])
def get_items(
    q: Optional[str] = Query(None, description="Búsqueda por nombre, código, BN, descripción o ubicación"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoría"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo de artículo"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Item)
    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                models.Item.nombre.ilike(search),
                models.Item.codigo.ilike(search),
                models.Item.numero_bien_nacional.ilike(search),
                models.Item.tipo_articulo.ilike(search),
                models.Item.descripcion.ilike(search),
                models.Item.ubicacion.ilike(search)
            )
        )
    if categoria and categoria != "Todas":
        query = query.filter(models.Item.categoria == categoria)
        
    if tipo and tipo != "Todos":
        query = query.filter(models.Item.tipo_articulo == tipo)
        
    return query.order_by(models.Item.id.desc()).all()

@app.post("/items", response_model=schemas.ItemResponse)
def create_item(item_in: schemas.ItemCreate, db: Session = Depends(get_db)):
    item = models.Item(
        codigo=item_in.codigo or f"ITM-{db.query(models.Item).count() + 1001}",
        numero_bien_nacional=item_in.numero_bien_nacional,
        tipo_articulo=item_in.tipo_articulo or "Activo Fijo",
        nombre=item_in.nombre,
        descripcion=item_in.descripcion,
        categoria=item_in.categoria or "General",
        cantidad=item_in.cantidad,
        precio_unitario=item_in.precio_unitario,
        ubicacion=item_in.ubicacion
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.put("/items/{item_id}", response_model=schemas.ItemResponse)
def update_item(item_id: int, item_in: schemas.ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
        
    data = item_in.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(item, key, value)
        
    db.commit()
    db.refresh(item)
    return item

@app.patch("/items/{item_id}/stock", response_model=schemas.ItemResponse)
def adjust_stock(item_id: int, delta: int = Query(..., description="Cambio de stock (+1, -1, etc.)"), db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
    
    new_qty = max(0, (item.cantidad or 0) + delta)
    item.cantidad = new_qty
    db.commit()
    db.refresh(item)
    return item

@app.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado")
    db.delete(item)
    db.commit()
    return {"message": "Ítem eliminado correctamente", "id": item_id}

@app.post("/items/upload")
async def upload_inventory_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    contents = await file.read()
    filename = file.filename
    background_tasks.add_task(process_uploaded_file, contents, filename, db)
    return {"message": f"Archivo '{filename}' recibido. Procesando renglones con IA e insertando en base de datos."}
