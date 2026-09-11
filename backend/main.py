from fastapi import FastAPI, UploadFile, File, BackgroundTasks, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, text
from typing import List, Optional
import os
import re

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
        conn.execute(text("ALTER TABLE items ADD COLUMN IF NOT EXISTS estado VARCHAR;"))
        conn.execute(text("ALTER TABLE items ADD COLUMN IF NOT EXISTS sede VARCHAR;"))
        # Set default estado for items that might be null
        conn.execute(text("UPDATE items SET estado = 'Distrito Capital' WHERE estado IS NULL;"))
        conn.commit()

try:
    auto_migrate()
except Exception as e:
    print(f"Migration note: {e}")

VENEZUELA_STATES = [
    "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar",
    "Carabobo", "Cojedes", "Delta Amacuro", "Dependencias Federales",
    "Distrito Capital", "Falcón", "Guárico", "La Guaira", "Lara",
    "Mérida", "Miranda", "Monagas", "Nueva Esparta", "Portuguesa",
    "Sucre", "Táchira", "Trujillo", "Yaracuy", "Zulia"
]

def seed_defaults():
    from database import SessionLocal
    from sqlalchemy import text
    import time

    db = None
    for attempt in range(15):
        try:
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            break
        except Exception as e:
            print(f"[*] Esperando que PostgreSQL esté listo (intento {attempt+1}/15): {e}")
            if db:
                db.close()
            time.sleep(2)
    else:
        print("[!] No se pudo conectar a PostgreSQL tras 15 intentos.")
        return

    try:
        # Seed Categories if empty
        if db.query(models.Category).count() == 0:
            default_categories = [
                models.Category(nombre="Servidores", descripcion="Equipos de cómputo para centros de datos y virtualización", color="#3b82f6"),
                models.Category(nombre="Redes", descripcion="Switches, routers, firewalls y equipos de conectividad", color="#06b6d4"),
                models.Category(nombre="Conectividad", descripcion="Transceivers, cables ópticos y módulos de interconexión", color="#8b5cf6"),
                models.Category(nombre="Energía", descripcion="UPS, PDUs, plantas eléctricas y baterías de respaldo", color="#10b981"),
                models.Category(nombre="Cableado", descripcion="Bobinas UTP/STP, patch cords y accesorios de canalización", color="#f59e0b"),
                models.Category(nombre="Componentes", descripcion="Discos NVMe, memorias RAM, fuentes de poder y repuestos", color="#ec4899"),
                models.Category(nombre="Equipos de Impresion", descripcion="Impresoras láser, multifuncionales y escáneres", color="#6366f1"),
                models.Category(nombre="Mobiliario y Oficinas", descripcion="Escritorios, sillas ergonómicas, estantes y archivos", color="#14b8a6"),
            ]
            db.bulk_save_objects(default_categories)
            db.commit()

        # Seed Article Types if empty
        if db.query(models.ArticleType).count() == 0:
            default_types = [
                models.ArticleType(nombre="Activo Fijo", descripcion="Bienes tangibles de uso permanente sujetos a depreciación y control de Bien Nacional", prefijo="BN"),
                models.ArticleType(nombre="Equipo Tecnológico", descripcion="Hardware de computación, servidores, laptops y periféricos", prefijo="EQ"),
                models.ArticleType(nombre="Mobiliario", descripcion="Muebles y enseres de oficina", prefijo="MOB"),
                models.ArticleType(nombre="Consumible", descripcion="Materiales gastables que no requieren asignación de bien nacional", prefijo="CON"),
                models.ArticleType(nombre="Herramienta", descripcion="Instrumentos de trabajo, testers y herramientas técnicas", prefijo="HER"),
                models.ArticleType(nombre="Redes y Telecom", descripcion="Infraestructura de telecomunicaciones y enlaces", prefijo="RED"),
                models.ArticleType(nombre="Material de Oficina", descripcion="Artículos de papelería y suministros administrativos", prefijo="MAT"),
            ]
            db.bulk_save_objects(default_types)
            db.commit()

        # Seed Default Sedes / Galpones if empty
        if db.query(models.Sede).count() == 0:
            default_sedes = [
                models.Sede(nombre="Galpón Central La Yaguara", tipo="Galpón", estado="Distrito Capital", ciudad="Caracas", direccion="Av. Intercomunal La Yaguara, Parcela 12", responsable="Ing. Carlos Pérez", telefono="0212-4431122", capacidad="1,200 m²"),
                models.Sede(nombre="Oficina Principal Torre Europa", tipo="Sede Administrativa", estado="Miranda", ciudad="Chacao", direccion="Av. Francisco de Miranda, Piso 8", responsable="Lic. María Rodríguez", telefono="0212-9513344", capacidad="450 m²"),
                models.Sede(nombre="Almacén Regional Occidente", tipo="Almacén", estado="Zulia", ciudad="Maracaibo", direccion="Zona Industrial Maracaibo Sur, Galpón 4", responsable="Tsu. Roberto Gómez", telefono="0261-7352211", capacidad="800 m²"),
                models.Sede(nombre="Centro Logístico Carabobo", tipo="Galpón", estado="Carabobo", ciudad="Valencia", direccion="Zona Industrial Castillito, Parcela B", responsable="Ing. Elena Ramos", telefono="0241-8716655", capacidad="1,500 m²"),
                models.Sede(nombre="Estación Técnica Oriente", tipo="Oficina", estado="Anzoátegui", ciudad="Barcelona", direccion="Av. Jorge Rodríguez, Edif. Oriente", responsable="Ing. Luis Morales", telefono="0281-2869988", capacidad="300 m²"),
                models.Sede(nombre="Almacén Siderúrgico Guayana", tipo="Almacén", estado="Bolívar", ciudad="Puerto Ordaz", direccion="Zona Industrial Unare II, Calle 3", responsable="Tsu. Javier Soto", telefono="0286-9524433", capacidad="700 m²"),
            ]
            db.bulk_save_objects(default_sedes)
            db.commit()

        # Distribute items across sedes if null or unassigned
        all_items = db.query(models.Item).all()
        all_sedes = db.query(models.Sede).all()
        if all_sedes and all_items:
            for idx, item in enumerate(all_items):
                if not item.sede or not item.estado or item.sede == "Sede Central":
                    assigned_sede = all_sedes[idx % len(all_sedes)]
                    item.sede = assigned_sede.nombre
                    item.estado = assigned_sede.estado
            db.commit()

    except Exception as e:
        print(f"Seed defaults note: {e}")
        db.rollback()
    finally:
        db.close()

seed_defaults()

app = FastAPI(title="OdInventario API")

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8088",
    "http://127.0.0.1:8088",
    "http://192.168.100.2",
    "http://192.168.100.2:8088",
    "https://eltecnicoluisia.github.io",
]
env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    ALLOWED_ORIGINS.extend([o.strip() for o in env_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https:\/\/.*\.trycloudflare\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Odinventario Backend Running"}

# ==================== STATS ENDPOINT ====================
@app.get("/stats")
def get_inventory_stats(db: Session = Depends(get_db)):
    items = db.query(models.Item).all()
    sedes = db.query(models.Sede).all()
    
    total_items = len(items)
    total_stock = sum(item.cantidad for item in items)
    total_value = sum((item.cantidad * (item.precio_unitario or 0.0)) for item in items)
    low_stock = sum(1 for item in items if item.cantidad <= 3)
    
    # Categories & Types
    categories = [c.nombre for c in db.query(models.Category).order_by(models.Category.nombre).all()]
    if not categories:
        categories = sorted(list(set(item.categoria for item in items if item.categoria)))

    tipos = [t.nombre for t in db.query(models.ArticleType).order_by(models.ArticleType.nombre).all()]
    if not tipos:
        tipos = sorted(list(set(item.tipo_articulo for item in items if item.tipo_articulo)))

    bien_nacional_count = sum(1 for item in items if item.numero_bien_nacional)

    # State Statistics across Venezuela
    states_data = {}
    for st in VENEZUELA_STATES:
        st_items = [it for it in items if (it.estado or "").lower() == st.lower()]
        st_sedes = [sd for sd in sedes if (sd.estado or "").lower() == st.lower()]
        st_stock = sum(it.cantidad for it in st_items)
        st_value = sum((it.cantidad * (it.precio_unitario or 0.0)) for it in st_items)
        
        states_data[st] = {
            "estado": st,
            "items_count": len(st_items),
            "total_stock": st_stock,
            "total_value": round(st_value, 2),
            "sedes_count": len(st_sedes),
            "sedes": [s.nombre for s in st_sedes]
        }
    
    return {
        "total_items": total_items,
        "total_stock": total_stock,
        "total_value": round(total_value, 2),
        "low_stock": low_stock,
        "categories_count": len(categories),
        "categories": categories,
        "tipos": tipos,
        "bien_nacional_count": bien_nacional_count,
        "total_sedes": len(sedes),
        "states_data": states_data,
        "states_list": VENEZUELA_STATES
    }

# ==================== SEDES (GALPONES, OFICINAS, ALMACENES) CRUD ====================
@app.get("/sedes", response_model=List[schemas.SedeResponse])
def get_sedes(estado: Optional[str] = Query(None, description="Filtrar por estado de Venezuela"), db: Session = Depends(get_db)):
    query = db.query(models.Sede)
    if estado and estado != "Todos":
        query = query.filter(models.Sede.estado.ilike(f"%{estado}%"))
    
    sedes = query.order_by(models.Sede.estado, models.Sede.nombre).all()
    result = []
    for s in sedes:
        count = db.query(models.Item).filter(models.Item.sede == s.nombre).count()
        result.append({
            "id": s.id,
            "nombre": s.nombre,
            "tipo": s.tipo or "Galpón",
            "estado": s.estado,
            "ciudad": s.ciudad,
            "direccion": s.direccion,
            "responsable": s.responsable,
            "telefono": s.telefono,
            "capacidad": s.capacidad,
            "items_count": count,
            "fecha_creacion": s.fecha_creacion
        })
    return result

@app.post("/sedes", response_model=schemas.SedeResponse)
def create_sede(sede_in: schemas.SedeCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Sede).filter(models.Sede.nombre.ilike(sede_in.nombre.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una sede o galpón con ese nombre")

    sede = models.Sede(
        nombre=sede_in.nombre.strip(),
        tipo=sede_in.tipo or "Galpón",
        estado=sede_in.estado.strip(),
        ciudad=sede_in.ciudad,
        direccion=sede_in.direccion,
        responsable=sede_in.responsable,
        telefono=sede_in.telefono,
        capacidad=sede_in.capacidad
    )
    db.add(sede)
    db.commit()
    db.refresh(sede)
    return {
        "id": sede.id,
        "nombre": sede.nombre,
        "tipo": sede.tipo,
        "estado": sede.estado,
        "ciudad": sede.ciudad,
        "direccion": sede.direccion,
        "responsable": sede.responsable,
        "telefono": sede.telefono,
        "capacidad": sede.capacidad,
        "items_count": 0,
        "fecha_creacion": sede.fecha_creacion
    }

@app.put("/sedes/{sede_id}", response_model=schemas.SedeResponse)
def update_sede(sede_id: int, sede_in: schemas.SedeUpdate, db: Session = Depends(get_db)):
    sede = db.query(models.Sede).filter(models.Sede.id == sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede o galpón no encontrado")

    old_name = sede.nombre
    data = sede_in.model_dump(exclude_unset=True)
    for key, val in data.items():
        if val is not None:
            setattr(sede, key, val)

    if sede_in.nombre and sede_in.nombre.strip() != old_name:
        sede.nombre = sede_in.nombre.strip()
        db.query(models.Item).filter(models.Item.sede == old_name).update({"sede": sede.nombre})

    db.commit()
    db.refresh(sede)
    count = db.query(models.Item).filter(models.Item.sede == sede.nombre).count()
    return {
        "id": sede.id,
        "nombre": sede.nombre,
        "tipo": sede.tipo,
        "estado": sede.estado,
        "ciudad": sede.ciudad,
        "direccion": sede.direccion,
        "responsable": sede.responsable,
        "telefono": sede.telefono,
        "capacidad": sede.capacidad,
        "items_count": count,
        "fecha_creacion": sede.fecha_creacion
    }

@app.delete("/sedes/{sede_id}")
def delete_sede(sede_id: int, db: Session = Depends(get_db)):
    sede = db.query(models.Sede).filter(models.Sede.id == sede_id).first()
    if not sede:
        raise HTTPException(status_code=404, detail="Sede o galpón no encontrado")
    db.delete(sede)
    db.commit()
    return {"message": "Sede eliminada correctamente", "id": sede_id}

# ==================== CATEGORIES CRUD ====================
@app.get("/categories", response_model=List[schemas.CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    cats = db.query(models.Category).order_by(models.Category.nombre).all()
    result = []
    for cat in cats:
        count = db.query(models.Item).filter(models.Item.categoria == cat.nombre).count()
        c_dict = {
            "id": cat.id,
            "nombre": cat.nombre,
            "descripcion": cat.descripcion,
            "color": cat.color,
            "items_count": count,
            "fecha_creacion": cat.fecha_creacion
        }
        result.append(c_dict)
    return result

@app.post("/categories", response_model=schemas.CategoryResponse)
def create_category(cat_in: schemas.CategoryCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Category).filter(models.Category.nombre.ilike(cat_in.nombre)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")
    
    cat = models.Category(
        nombre=cat_in.nombre.strip(),
        descripcion=cat_in.descripcion,
        color=cat_in.color or "#3b82f6"
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return {"id": cat.id, "nombre": cat.nombre, "descripcion": cat.descripcion, "color": cat.color, "items_count": 0, "fecha_creacion": cat.fecha_creacion}

@app.put("/categories/{cat_id}", response_model=schemas.CategoryResponse)
def update_category(cat_id: int, cat_in: schemas.CategoryUpdate, db: Session = Depends(get_db)):
    cat = db.query(models.Category).filter(models.Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    old_name = cat.nombre
    if cat_in.nombre:
        cat.nombre = cat_in.nombre.strip()
        db.query(models.Item).filter(models.Item.categoria == old_name).update({"categoria": cat.nombre})

    if cat_in.descripcion is not None:
        cat.descripcion = cat_in.descripcion
    if cat_in.color is not None:
        cat.color = cat_in.color

    db.commit()
    db.refresh(cat)
    count = db.query(models.Item).filter(models.Item.categoria == cat.nombre).count()
    return {"id": cat.id, "nombre": cat.nombre, "descripcion": cat.descripcion, "color": cat.color, "items_count": count, "fecha_creacion": cat.fecha_creacion}

@app.delete("/categories/{cat_id}")
def delete_category(cat_id: int, db: Session = Depends(get_db)):
    cat = db.query(models.Category).filter(models.Category.id == cat_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    db.delete(cat)
    db.commit()
    return {"message": "Categoría eliminada", "id": cat_id}

# ==================== ARTICLE TYPES CRUD ====================
@app.get("/types", response_model=List[schemas.ArticleTypeResponse])
def get_article_types(db: Session = Depends(get_db)):
    types = db.query(models.ArticleType).order_by(models.ArticleType.nombre).all()
    result = []
    for t in types:
        count = db.query(models.Item).filter(models.Item.tipo_articulo == t.nombre).count()
        result.append({
            "id": t.id,
            "nombre": t.nombre,
            "descripcion": t.descripcion,
            "prefijo": t.prefijo,
            "items_count": count,
            "fecha_creacion": t.fecha_creacion
        })
    return result

@app.post("/types", response_model=schemas.ArticleTypeResponse)
def create_article_type(type_in: schemas.ArticleTypeCreate, db: Session = Depends(get_db)):
    existing = db.query(models.ArticleType).filter(models.ArticleType.nombre.ilike(type_in.nombre)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un tipo con ese nombre")
    
    tp = models.ArticleType(
        nombre=type_in.nombre.strip(),
        descripcion=type_in.descripcion,
        prefijo=type_in.prefijo
    )
    db.add(tp)
    db.commit()
    db.refresh(tp)
    return {"id": tp.id, "nombre": tp.nombre, "descripcion": tp.descripcion, "prefijo": tp.prefijo, "items_count": 0, "fecha_creacion": tp.fecha_creacion}

@app.put("/types/{type_id}", response_model=schemas.ArticleTypeResponse)
def update_article_type(type_id: int, type_in: schemas.ArticleTypeUpdate, db: Session = Depends(get_db)):
    tp = db.query(models.ArticleType).filter(models.ArticleType.id == type_id).first()
    if not tp:
        raise HTTPException(status_code=404, detail="Tipo no encontrado")
    
    old_name = tp.nombre
    if type_in.nombre:
        tp.nombre = type_in.nombre.strip()
        db.query(models.Item).filter(models.Item.tipo_articulo == old_name).update({"tipo_articulo": tp.nombre})

    if type_in.descripcion is not None:
        tp.descripcion = type_in.descripcion
    if type_in.prefijo is not None:
        tp.prefijo = type_in.prefijo

    db.commit()
    db.refresh(tp)
    count = db.query(models.Item).filter(models.Item.tipo_articulo == tp.nombre).count()
    return {"id": tp.id, "nombre": tp.nombre, "descripcion": tp.descripcion, "prefijo": tp.prefijo, "items_count": count, "fecha_creacion": tp.fecha_creacion}

@app.delete("/types/{type_id}")
def delete_article_type(type_id: int, db: Session = Depends(get_db)):
    tp = db.query(models.ArticleType).filter(models.ArticleType.id == type_id).first()
    if not tp:
        raise HTTPException(status_code=404, detail="Tipo no encontrado")
    db.delete(tp)
    db.commit()
    return {"message": "Tipo eliminado", "id": type_id}

# ==================== ITEMS CRUD ====================
@app.get("/items", response_model=List[schemas.ItemResponse])
def get_items(
    q: Optional[str] = Query(None, description="Búsqueda por nombre, código, BN, descripción o ubicación"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoría"),
    tipo: Optional[str] = Query(None, description="Filtrar por tipo de artículo"),
    estado: Optional[str] = Query(None, description="Filtrar por estado de Venezuela"),
    sede: Optional[str] = Query(None, description="Filtrar por galpón u oficina"),
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
                models.Item.categoria.ilike(search),
                models.Item.descripcion.ilike(search),
                models.Item.ubicacion.ilike(search),
                models.Item.estado.ilike(search),
                models.Item.sede.ilike(search)
            )
        )
    if categoria and categoria != "Todas":
        query = query.filter(models.Item.categoria == categoria)
        
    if tipo and tipo != "Todos":
        query = query.filter(models.Item.tipo_articulo == tipo)

    if estado and estado != "Todos":
        query = query.filter(models.Item.estado.ilike(f"%{estado}%"))

    if sede and sede != "Todas":
        query = query.filter(models.Item.sede == sede)
        
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
        estado=item_in.estado or "Distrito Capital",
        sede=item_in.sede,
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
    file: UploadFile = File(...)
):
    ALLOWED_EXTENSIONS = {'.xlsx', '.xls', '.pdf', '.docx', '.doc'}
    filename = file.filename or "archivo"
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Formato no permitido. Solo se admiten archivos: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    
    # Max file size limit: 15 MB
    MAX_FILE_SIZE = 15 * 1024 * 1024
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="El archivo excede el tamaño máximo permitido de 15MB."
        )
    
    background_tasks.add_task(process_uploaded_file, contents, filename)
    return {"message": f"Archivo '{filename}' recibido. Procesando renglones con IA e insertando en base de datos."}
