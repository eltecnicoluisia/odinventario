from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    color = Column(String, default="#3b82f6")
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

class ArticleType(Base):
    __tablename__ = "article_types"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, unique=True, index=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    prefijo = Column(String, nullable=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

class Sede(Base):
    __tablename__ = "sedes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True, nullable=False) # Ej: "Galpón 1 La Yaguara", "Oficina Torre Europa"
    tipo = Column(String, default="Galpón")             # "Galpón", "Oficina", "Almacén", "Sede Administrativa"
    estado = Column(String, index=True, nullable=False) # Estado de Venezuela (ej. "Distrito Capital", "Zulia")
    ciudad = Column(String, nullable=True)              # Ej: "Caracas", "Maracaibo", "Valencia"
    direccion = Column(Text, nullable=True)
    responsable = Column(String, nullable=True)
    telefono = Column(String, nullable=True)
    capacidad = Column(String, nullable=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, index=True, nullable=True)
    numero_bien_nacional = Column(String, index=True, nullable=True) # N° Bien Nacional
    tipo_articulo = Column(String, index=True, nullable=True)       # Ej: Activo Fijo, Consumible, Equipo...
    nombre = Column(String, index=True, nullable=False)
    descripcion = Column(Text, nullable=True)
    categoria = Column(String, index=True, nullable=True)
    cantidad = Column(Integer, default=0)
    precio_unitario = Column(Float, default=0.0)
    estado = Column(String, index=True, nullable=True, default="Distrito Capital") # Estado de Venezuela
    sede = Column(String, index=True, nullable=True)                               # Galpón / Oficina asignado
    ubicacion = Column(String, nullable=True)                                      # Estante, pasillo o detalle interno
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())
