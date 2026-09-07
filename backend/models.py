from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.sql import func
from database import Base

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
    ubicacion = Column(String, nullable=True)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())
