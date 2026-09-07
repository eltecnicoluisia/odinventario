# 📦 ODINVENTARIO - Enterprise Inventory & Institutional Asset Management

[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

Sistema integral de control de inventario físico, tecnológico e institucional, diseñado con una interfaz moderna **Dark Glassmorphism** con bordes biselados y retroiluminación neón sutil. Incorpora gestión estricta de **Bienes Nacionales (BN)**, CRUD dinámico de **Categorías** y **Tipos de Artículos**, y un motor de **Carga Masiva con Inteligencia Artificial**.

---

## 🌟 Características Principales

- **📦 Inventario General:**
  - Control de existencias físicas y valoración económica en tiempo real ($ USD).
  - Identificación visual prioritaria de **Número de Bien Nacional (BN)** y SKU interno.
  - Ajuste rápido de stock con un solo clic (`+1` / `-1`).
  - Filtros instantáneos por categoría, clasificación normativa y alertas de stock crítico (≤ 3 unidades).
  - Modales de creación y edición con validación reactiva.

- **🏷️ Gestión de Categorías:**
  - Creación, modificación y eliminación de categorías.
  - Paleta de colores distintivos y conteo automático de artículos asociados.

- **⚙️ Tipos de Artículos (Clasificación Normativa):**
  - Configuración de tipos de bienes: *Activo Fijo*, *Equipo Tecnológico*, *Mobiliario*, *Consumible*, *Herramienta*, *Redes*, etc.
  - Asignación de prefijos normativos (`BN`, `EQ`, `MOB`, `CON`) para codificación automática.

- **📑 Carga Masiva Inteligente con IA:**
  - Procesamiento en segundo plano de documentos en formatos **Excel (`.xlsx`, `.xls`)**, **Word (`.docx`)** y **PDF (`.pdf`)**.
  - Reconocimiento autónomo de columnas, números de bienes nacionales, cantidades y clasificación.

- **🎨 Arquitectura Visual (Glassmorphism):**
  - Paneles traslúcidos con desenfoque de fondo (`backdrop-filter: blur(18px)`).
  - Biselado superior y lateral con reflejos especulares de luz.
  - Acentos de neón sutiles en cian, azul, púrpura y esmeralda.
  - Navegación instantánea mediante pestañas y acceso rápido a la pantalla principal haciendo clic en el logo.

---

## 🏗️ Arquitectura del Sistema

```text
               +-------------------------------------------------+
               |             Nginx Gateway (Puerto 8088)         |
               +-----------------------+-------------------------+
                                       |
                   +-------------------+-------------------+
                   | /                                     | /api/
                   v                                       v
         +-------------------+                   +-------------------+
         | Frontend (Next 16)|                   | Backend (FastAPI) |
         |   Turbopack &     |                   |  Uvicorn Worker   |
         |  Tailwind CSS v4  |                   +---------+---------+
         +-------------------+                             |
                                            +--------------+--------------+
                                            v                             v
                                  +-------------------+         +-------------------+
                                  |   PostgreSQL 16   |         |      Redis 7      |
                                  |   (Base de Datos) |         |  (Cola de Tareas) |
                                  +-------------------+         +-------------------+
```

---

## 🚀 Despliegue con Docker Compose

### Requisitos Previos
- Docker Engine 24+ y Docker Compose v2.

### Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/eltecnicoluisia/odinventario.git
   cd odinventario
   ```

2. **Configurar variables de entorno:**
   Crea un archivo `.env` en la raíz (opcional para claves de IA):
   ```env
   OPENAI_API_KEY=tu_clave_opcional
   ```

3. **Iniciar los contenedores en producción:**
   ```bash
   docker compose up -d --build
   ```

4. **Acceder a la aplicación:**
   - **Frontend & Gateway:** [http://localhost:8088](http://localhost:8088)
   - **Documentación Interactiva API (Swagger):** [http://localhost:8088/api/docs](http://localhost:8088/api/docs)
   - **Estado de Salud de la API:** [http://localhost:8088/api/health](http://localhost:8088/api/health)

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide Icons.
- **Backend:** Python 3.11, FastAPI, SQLAlchemy ORM, Pydantic v2, Uvicorn, OpenAI API.
- **Base de Datos:** PostgreSQL 16 Alpine.
- **Caché & Mensajería:** Redis 7 Alpine.
- **Reverse Proxy / Gateway:** Nginx Alpine.

---

## 📄 Licencia
Este proyecto está bajo la Licencia MIT.
