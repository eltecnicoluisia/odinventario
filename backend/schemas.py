from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ItemBase(BaseModel):
    codigo: Optional[str] = None
    numero_bien_nacional: Optional[str] = None
    tipo_articulo: Optional[str] = "Activo Fijo"
    nombre: str
    descripcion: Optional[str] = None
    categoria: Optional[str] = "General"
    cantidad: int = 0
    precio_unitario: float = 0.0
    ubicacion: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    codigo: Optional[str] = None
    numero_bien_nacional: Optional[str] = None
    tipo_articulo: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    categoria: Optional[str] = None
    cantidad: Optional[int] = None
    precio_unitario: Optional[float] = None
    ubicacion: Optional[str] = None

class ItemResponse(ItemBase):
    id: int
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None

    class Config:
        from_attributes = True
