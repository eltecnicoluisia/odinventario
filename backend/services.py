import pandas as pd
from io import BytesIO
from sqlalchemy.orm import Session
import models
import os
import json
from database import SessionLocal

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import docx
except ImportError:
    docx = None

def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "tu_api_key_aqui":
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except Exception as e:
        print(f"OpenAI init warning: {e}")
        return None

def extract_text_from_pdf(contents: bytes) -> str:
    if not pdfplumber:
        print("pdfplumber no está disponible en el entorno")
        return ""
    text = ""
    try:
        with pdfplumber.open(BytesIO(contents)) as pdf:
            for page in pdf.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text

def extract_text_from_docx(contents: bytes) -> str:
    if not docx:
        print("docx no está disponible en el entorno")
        return ""
    text = ""
    try:
        doc = docx.Document(BytesIO(contents))
        for para in doc.paragraphs:
            text += para.text + "\n"
    except Exception as e:
        print(f"Error reading DOCX: {e}")
    return text

def parse_text_with_llm(text: str) -> list:
    client = get_openai_client()
    if not client:
        print("OpenAI client not configured or invalid API key. Skipping LLM parsing.")
        return []
        
    prompt = f"""
    Eres un experto analizador de inventarios. Extrae los items de inventario del siguiente texto.
    Devuelve estrictamente un array de objetos JSON con las siguientes claves:
    - codigo (string, opcional)
    - nombre (string, obligatorio)
    - descripcion (string, opcional)
    - categoria (string, opcional)
    - cantidad (integer, por defecto 0)
    - precio_unitario (float, por defecto 0.0)
    - ubicacion (string, opcional)
    
    Texto:
    {text[:4000]}
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "system", "content": prompt}],
            response_format={ "type": "json_object" }
        )
        content = response.choices[0].message.content
        data = json.loads(content)
        # Handle cases where the LLM might wrap the array in a dict key like "items"
        if isinstance(data, dict):
            for k, v in data.items():
                if isinstance(v, list):
                    return v
            return [data]
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"LLM parsing error: {e}")
        return []

def process_uploaded_file(contents: bytes, filename: str, db: Session = None):
    should_close_db = False
    if db is None:
        db = SessionLocal()
        should_close_db = True

    try:
        items_to_add = []
        
        if filename.lower().endswith(('.xlsx', '.xls')):
            try:
                df = pd.read_excel(BytesIO(contents))
                # Basic mapping, assuming columns match somewhat. 
                for _, row in df.iterrows():
                    items_to_add.append({
                        "nombre": str(row.get('nombre', row.get('Nombre', 'Item sin nombre'))),
                        "cantidad": int(row.get('cantidad', row.get('Cantidad', 0))),
                        "categoria": str(row.get('categoria', row.get('Categoria', 'General')))
                    })
            except Exception as e:
                print(f"Error processing Excel: {e}")
                
        elif filename.lower().endswith('.pdf'):
            text = extract_text_from_pdf(contents)
            items_to_add = parse_text_with_llm(text)
            
        elif filename.lower().endswith(('.docx', '.doc')):
            text = extract_text_from_docx(contents)
            items_to_add = parse_text_with_llm(text)
            
        # Bulk insert
        if items_to_add:
            db_items = []
            for item_data in items_to_add:
                if isinstance(item_data, dict) and 'nombre' in item_data:
                    db_item = models.Item(
                        codigo=item_data.get('codigo'),
                        nombre=item_data.get('nombre', 'Item Generico'),
                        descripcion=item_data.get('descripcion'),
                        categoria=item_data.get('categoria'),
                        cantidad=int(item_data.get('cantidad', 0)),
                        precio_unitario=float(item_data.get('precio_unitario', 0.0)),
                        ubicacion=item_data.get('ubicacion')
                    )
                    db_items.append(db_item)
            
            if db_items:
                db.bulk_save_objects(db_items)
                db.commit()
                print(f"Inserted {len(db_items)} items from {filename}")
    except Exception as e:
        print(f"Error in process_uploaded_file: {e}")
        if db:
            db.rollback()
    finally:
        if should_close_db and db:
            db.close()
