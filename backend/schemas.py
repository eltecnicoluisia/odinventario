from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Category Schemas
class CategoryBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    color: Optional[str] = "#3b82f6"

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    color: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: int
    items_count: Optional[int] = 0
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

# ArticleType Schemas
class ArticleTypeBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    prefijo: Optional[str] = None

class ArticleTypeCreate(ArticleTypeBase):
    pass

class ArticleTypeUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    prefijo: Optional[str] = None

class ArticleTypeResponse(ArticleTypeBase):
    id: int
    items_count: Optional[int] = 0
    fecha_creacion: Optional[datetime] = None

    class Config:
        from_attributes = True

# Item Schemas
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
