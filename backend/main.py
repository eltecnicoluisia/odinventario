from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional

from database import engine, get_db, Base
import models
import schemas
from services import process_uploaded_file

# Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="OdInventario API", root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def seed_initial_data():
    """Seeds sample data if database is brand new"""
    from database import SessionLocal
    db = SessionLocal()
    try:
        count = db.query(models.Item).count()
        if count == 0:
            sample_items = [
                models.Item(codigo="SRV-DL-R740", nombre="Servidor Dell PowerEdge R740", descripcion="2x Xeon Silver 4210R, 64GB RAM, 2x 480GB SSD", categoria="Servidores", cantidad=4, precio_unitario=3450.00, ubicacion="Rack Principal - Fila A"),
                models.Item(codigo="SW-CIS-9200", nombre="Switch Cisco Catalyst 9200L 48P PoE+", descripcion="Switch administrable Gigabit L3 con fuentes redundantes", categoria="Redes", cantidad=8, precio_unitario=1890.50, ubicacion="Almacén Redes - Estante 2"),
                models.Item(codigo="RT-MIK-CCR2", nombre="Router MikroTik CCR2004-1G-12S+2XS", descripcion="Router Cloud Core para borde de red con puertos 10G/25G", categoria="Redes", cantidad=3, precio_unitario=590.00, ubicacion="Laboratorio Redes"),
                models.Item(codigo="SFP-10G-SR", nombre="Transceiver SFP+ 10GBASE-SR 850nm", descripcion="Módulo óptico multimodo LC dúplex hasta 300m", categoria="Conectividad", cantidad=45, precio_unitario=32.00, ubicacion="Gaveta Óptica 03"),
                models.Item(codigo="UPS-APC-3K", nombre="UPS Online APC Smart-UPS RT 3000VA", descripcion="Sistema de respaldo eléctrico con tarjeta de red SNMP", categoria="Energía", cantidad=2, precio_unitario=1420.00, ubicacion="Sala de Energía"),
                models.Item(codigo="CAB-UTP-CAT6A", nombre="Bobina Cable UTP Cat6A 305m 100% Cobre", descripcion="Cable estructurado LSZH azul para centros de datos", categoria="Cableado", cantidad=12, precio_unitario=185.00, ubicacion="Bodega General - Palet 1"),
                models.Item(codigo="SSD-NVME-2TB", nombre="Disco SSD Samsung 990 PRO 2TB NVMe", descripcion="Almacenamiento ultrarrápido PCIe 4.0 para estaciones de trabajo", categoria="Componentes", cantidad=1, precio_unitario=175.00, ubicacion="Gabinete Seguro B"),
            ]
            db.bulk_save_objects(sample_items)
            db.commit()
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

seed_initial_data()

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
    
    # Categories breakdown
    categories_set = set(item.categoria for item in items if item.categoria)
    
    return {
        "total_items": total_items,
        "total_stock": total_stock,
        "total_value": round(total_value, 2),
        "low_stock": low_stock,
        "categories_count": len(categories_set),
        "categories": sorted(list(categories_set))
    }

@app.get("/items", response_model=List[schemas.ItemResponse])
def get_items(
    q: Optional[str] = Query(None, description="Búsqueda por nombre, código o descripción"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoría"),
    db: Session = Depends(get_db)
):
    query = db.query(models.Item)
    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                models.Item.nombre.ilike(search),
                models.Item.codigo.ilike(search),
                models.Item.descripcion.ilike(search),
                models.Item.ubicacion.ilike(search)
            )
        )
    if categoria and categoria != "Todas":
        query = query.filter(models.Item.categoria == categoria)
        
    return query.order_by(models.Item.id.desc()).all()

@app.post("/items", response_model=schemas.ItemResponse)
def create_item(item_in: schemas.ItemCreate, db: Session = Depends(get_db)):
    item = models.Item(
        codigo=item_in.codigo or f"ITM-{db.query(models.Item).count() + 1001}",
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
