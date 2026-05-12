import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

app = FastAPI(title="HGC Chat API (Ollama)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Ollama (local, no requiere internet ni API key) ───────────────────────────
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama",  # Ollama no valida la key, pero la librería la requiere
)
MODEL = "phi3:mini"

SYSTEM_PROMPT = """Eres un asistente inteligente del sistema HGC (El Espejo del Negocio).
HGC es una plataforma de analítica predictiva para una empresa de retail/restaurantes en Bolivia.
El sistema incluye: CLV (valor del cliente), Churn (predicción de abandono),
BCG (portafolio de productos), Canibalización de ventas, Rendimiento de sucursales,
elasticidad de precios y eficiencia operativa.
Los datos vienen de Snowflake y se procesan con Python, dbt y MLflow.
Responde siempre en español, de forma profesional, concisa y orientada al negocio."""


# ─── MODELOS DE ENTRADA ───────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str

class ReportRequest(BaseModel):
    module: str        # Nombre del módulo (ej: "CLV", "Churn", "BCG")
    data: dict         # Los datos del dashboard en JSON

class AnalystRequest(BaseModel):
    module: str
    data: dict
    question: str = "" # Pregunta opcional adicional

class SnowflakeQueryRequest(BaseModel):
    question: str      # Pregunta en español natural


# ─── ENDPOINT PRINCIPAL: CHAT ────────────────────────────────────────────────

@app.get("/")
def read_root():
    return {"status": "HGC Chat API running", "model": MODEL, "provider": "Ollama"}

@app.post("/chat")
def chat(request: ChatRequest):
    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": request.message},
            ],
            temperature=0.7,
            max_tokens=512,
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        return {"error": str(e), "tip": "Verifica que Ollama esté corriendo: ejecuta 'ollama serve' en CMD."}


# ─── FUNCIÓN 1: GENERAR REPORTE EJECUTIVO ────────────────────────────────────

@app.post("/smart/report")
def generate_report(request: ReportRequest):
    """
    Recibe los datos de cualquier módulo del dashboard y genera
    un reporte ejecutivo en texto con insights de negocio.
    """
    try:
        prompt = f"""Analiza los siguientes datos del módulo "{request.module}" del sistema HGC
y genera un reporte ejecutivo profesional en español con:
1. Resumen de la situación actual (2-3 oraciones)
2. 3 hallazgos clave
3. 2 recomendaciones de acción inmediata

Datos del módulo:
{request.data}

Sé específico con los números y nombres que aparecen en los datos."""

        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.6,
            max_tokens=800,
        )
        return {
            "module": request.module,
            "report": completion.choices[0].message.content
        }
    except Exception as e:
        return {"error": str(e)}


# ─── FUNCIÓN 2: ANÁLISIS INTELIGENTE DE DASHBOARD ────────────────────────────

@app.post("/smart/analyst")
def smart_analyst(request: AnalystRequest):
    """
    Interpreta los datos del dashboard actual y entrega recomendaciones
    de negocio personalizadas. Opcionalmente responde una pregunta específica.
    """
    try:
        base_prompt = f"""Eres un analista de negocios experto revisando el módulo "{request.module}".
Tienes acceso a los siguientes datos en tiempo real:

{request.data}

"""
        if request.question:
            base_prompt += f"El usuario pregunta específicamente: {request.question}\n\nResponde con datos concretos de la información provista."
        else:
            base_prompt += """Basándote en estos datos, proporciona:
- Una interpretación de la tendencia principal
- El punto más crítico que requiere atención
- Una oportunidad de mejora concreta con impacto estimado en ventas o margen"""

        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": base_prompt},
            ],
            temperature=0.7,
            max_tokens=600,
        )
        return {
            "module": request.module,
            "analysis": completion.choices[0].message.content
        }
    except Exception as e:
        return {"error": str(e)}


# ─── FUNCIÓN 3: CONSULTA SNOWFLAKE EN LENGUAJE NATURAL ───────────────────────

import re
import unicodedata

# Mapa de corrección: columnas que phi3:mini suele truncar → nombre real verificado
COLUMN_CORRECTIONS = {
    r'\bNOM\b(?!\w)': 'NOMBRE_PRODUCTO',
    r'\bNOMBRE_PROD\b': 'NOMBRE_PRODUCTO',
    r'\bCAT\b(?!\w)': 'CATEGORIA_NOMBRE',
    r'\bCATE\b': 'CATEGORIA_NOMBRE',
    r'\bCANT\b(?!\w)': 'CANTIDAD_VENDIDA',
    r'\bCAN_VEN\b': 'CANTIDAD_VENDIDA',
    r'\bPRECIO\b(?!\w)': 'PRECIO_UNITARIO_VENTA',
    r'\bPRE_UNI\b': 'PRECIO_UNITARIO_VENTA',
    r'\bMONTO\b(?!\w)': 'MONTO_SUBTOTAL_NETO',
    r'\bMON_SUBTOT\b': 'MONTO_SUBTOTAL_NETO',
    r'\bNOMBRE_SUC\b': 'NOMBRE_SUCURSAL',
    r'\bNOM_SUC\b': 'NOMBRE_SUCURSAL',
    r'\bFECHA_APER\b': 'FECHA_APERTURA',
    r'\bNOMBRE_CLI\b': 'NOMBRE_COMPLETO',
    r'\bNOM_CLI\b': 'NOMBRE_COMPLETO',
    r'\bTOT_VEN\b': 'TOTAL_VENTAS',
    r'\bUTI_NET\b': 'UTILIDAD_NETA',
    # DIM_TIEMPO corrections (very common model mistakes)
    r'\bANO\b': 'ANIO',
    r'\bA\u00d1O\b': 'ANIO',
    r'\bMES_NUMERO\b': 'MES',
    r'\bNOMBRE_DIA\b': 'DIA_SEMANA',
    r'\bES_FERIADO_BO\b': 'ES_FERIADO',
}

def clean_sql(sql: str) -> str:
    """Limpia el SQL: quita markdown, acentos, corrige columnas truncadas, deduplica LIMIT."""
    sql = re.sub(r'```(?:sql)?', '', sql, flags=re.IGNORECASE).strip('`').strip()
    match = re.search(r'\b(SELECT|WITH|SHOW|DESCRIBE)\b', sql, re.IGNORECASE)
    if match:
        sql = sql[match.start():]
    # Normalizar acentos
    normalized = unicodedata.normalize('NFD', sql)
    sql = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
    sql = sql.encode('ascii', errors='ignore').decode('ascii')
    # Corregir columnas truncadas
    for pattern, replacement in COLUMN_CORRECTIONS.items():
        sql = re.sub(pattern, replacement, sql, flags=re.IGNORECASE)
    # ── Corregir funciones no soportadas en Snowflake ────────────────────────
    # FIRST(x) / LAST(x) no existen — reemplazar con MIN/MAX
    sql = re.sub(r'\bFIRST\s*\(', 'MIN(', sql, flags=re.IGNORECASE)
    sql = re.sub(r'\bLAST\s*\(',  'MAX(', sql, flags=re.IGNORECASE)
    # ISNULL(x, y) → COALESCE(x, y)
    sql = re.sub(r'\bISNULL\s*\(', 'COALESCE(', sql, flags=re.IGNORECASE)
    # TOP N → LIMIT N  (SQL Server syntax)
    sql = re.sub(r'\bSELECT\s+TOP\s+(\d+)\b', r'SELECT /*TOP \1*/', sql, flags=re.IGNORECASE)
    top_match = re.search(r'/\*TOP (\d+)\*/', sql)
    if top_match:
        n = top_match.group(1)
        sql = sql.replace(top_match.group(0), '')
        sql = sql.rstrip(';') + f' LIMIT {n}'
    # FETCH FIRST N ROWS ONLY → LIMIT N
    sql = re.sub(r'\bFETCH\s+FIRST\s+(\d+)\s+ROWS?\s+ONLY\b', r'LIMIT \1', sql, flags=re.IGNORECASE)
    # Deduplicar LIMIT
    limits = [(m.start(), m.end()) for m in re.finditer(r'\bLIMIT\s+\d+', sql, re.IGNORECASE)]
    if len(limits) > 1:
        sql = sql[:limits[1].start()].rstrip().rstrip(';')
    if not re.search(r'\bLIMIT\b', sql, re.IGNORECASE):
        sql = sql.rstrip(';') + ' LIMIT 20'
    return sql.strip()



@app.post("/smart/query")
def natural_language_query(request: SnowflakeQueryRequest):
    """
    Convierte una pregunta en español a SQL de Snowflake,
    ejecuta la consulta y devuelve los resultados.
    """
    try:
        import snowflake.connector

        # 1. Generar SQL con la IA — prompt muy estricto para evitar caracteres especiales
        sql_prompt = f"""You are a Snowflake SQL expert for HGC (Hermanos Golden Chicken), a Bolivian fast-food chain.
Generate ONLY a valid Snowflake SQL query. No explanations, no markdown, no backticks, no comments.

CRITICAL RULES:
1. Output ONLY raw SQL — nothing else
2. ALL identifiers plain ASCII, NO Spanish accents in SQL identifiers
3. ALWAYS prefix tables: HGC_DW.GOLD.<TABLE>
4. Forbidden functions: FIRST(), LAST(), ISNULL(), TOP N — use MIN/MAX/COALESCE/LIMIT instead
5. Boolean values: use TRUE/FALSE not 1/0 for boolean columns

SEMANTIC ORDERING RULES (very important):
- "primer / primera / mas antigua / apertura mas antigua" → ORDER BY FECHA_APERTURA ASC LIMIT 1
- "ultimo / ultima / mas reciente / apertura mas reciente" → ORDER BY FECHA_APERTURA DESC LIMIT 1
- "mayor venta / top ventas / mas vendido" → ORDER BY <monto> DESC LIMIT 10
- "menor / peor / minimo" → ORDER BY <monto> ASC LIMIT 10
- "cuantos / cantidad / total de" → SELECT COUNT(*)
- "promedio / media" → SELECT AVG(...)

Database: HGC_DW  |  Schema: GOLD

VERIFIED TABLE SCHEMAS (use EXACTLY these column names):

DIM_SUCURSAL: ID_SUCURSAL_SK, ID_SUCURSAL_NK, NOMBRE_SUCURSAL, CIUDAD, DIRECCION,
  TIPO_FORMATO, FECHA_APERTURA, ESTADO_SUCURSAL, NOMBRE_GERENTE, ES_ACTUAL

DIM_PRODUCTO: ID_PRODUCTO_SK, ID_PRODUCTO_NK, NOMBRE_PRODUCTO, CATEGORIA_NOMBRE,
  TIPO_PRODUCTO, PRECIO_BASE_HISTORICO, COSTO_ESTANDAR_HISTORICO, ACTIVO, ES_ACTUAL

DIM_CLIENTE: ID_CLIENTE_SK, ID_CLIENTE_NK, NOMBRE_COMPLETO, CELULAR, EMAIL,
  GENERO, SEGMENTO, RANGO_EDAD, ES_ACTUAL

DIM_TIEMPO: ID_FECHA_SK, FECHA, DIA_SEMANA, NUMERO_DIA_SEMANA, DIA_MES,
  DIA_ANIO, SEMANA_ANIO, MES, NOMBRE_MES, TRIMESTRE, ANIO,
  ES_FERIADO, ES_FIN_SEMANA
  (NOTE: year=ANIO not ANO, month=MES not MES_NUMERO)

FACT_VENTAS_DETALLE: ID_FECHA_SK, ID_HORA_SK, ID_SUCURSAL_SK, ID_PRODUCTO_SK,
  ID_CLIENTE_SK, ID_EMPLEADO_SK, NRO_PEDIDO_DD, CANTIDAD_VENDIDA,
  PRECIO_UNITARIO_VENTA, MONTO_SUBTOTAL_BRUTO, MONTO_DESCUENTO_LINEA,
  MONTO_SUBTOTAL_NETO, MONTO_IMPUESTO_PRORRATEADO

MART_VENTAS_HISTORICAS: FECHA, ID_SUCURSAL_SK, NOMBRE_SUCURSAL,
  VENTAS_REALES, COMISIONES, MERMAS, COSTOS

MART_SUCURSALES_CONSOLIDADO: ID_SUCURSAL_SK, ID_SUCURSAL_NK, NOMBRE_SUCURSAL,
  CIUDAD, DIRECCION, ID_FECHA_SK, TOTAL_VENTAS, TOTAL_TICKETS,
  TICKET_PROMEDIO, TOTAL_MERMAS

MART_RENTABILIDAD_DIAGNOSTICA: ID_SUCURSAL_SK, NOMBRE_SUCURSAL, ID_FECHA_SK,
  INGRESO_BRUTO, COMISIONES_DELIVERY, TOTAL_MERMAS, COSTO_OPERATIVO,
  UTILIDAD_NETA, ES_FERIADO, FACTOR_TIEMPO

JOIN KEYS:
  FACT_VENTAS_DETALLE.ID_SUCURSAL_SK = DIM_SUCURSAL.ID_SUCURSAL_SK
  FACT_VENTAS_DETALLE.ID_PRODUCTO_SK  = DIM_PRODUCTO.ID_PRODUCTO_SK
  FACT_VENTAS_DETALLE.ID_CLIENTE_SK   = DIM_CLIENTE.ID_CLIENTE_SK
  FACT_VENTAS_DETALLE.ID_FECHA_SK     = DIM_TIEMPO.ID_FECHA_SK

EXAMPLES:
Q: "primera sucursal en abrir"
A: SELECT NOMBRE_SUCURSAL, CIUDAD, FECHA_APERTURA FROM HGC_DW.GOLD.DIM_SUCURSAL WHERE ES_ACTUAL = TRUE ORDER BY FECHA_APERTURA ASC LIMIT 1

Q: "sucursal mas reciente"
A: SELECT NOMBRE_SUCURSAL, CIUDAD, FECHA_APERTURA FROM HGC_DW.GOLD.DIM_SUCURSAL WHERE ES_ACTUAL = TRUE ORDER BY FECHA_APERTURA DESC LIMIT 1

Q: "top 5 productos mas vendidos"
A: SELECT p.NOMBRE_PRODUCTO, SUM(f.CANTIDAD_VENDIDA) AS TOTAL FROM HGC_DW.GOLD.FACT_VENTAS_DETALLE f JOIN HGC_DW.GOLD.DIM_PRODUCTO p ON f.ID_PRODUCTO_SK = p.ID_PRODUCTO_SK GROUP BY p.NOMBRE_PRODUCTO ORDER BY TOTAL DESC LIMIT 5

Q: "cuantas sucursales hay en La Paz"
A: SELECT COUNT(*) AS TOTAL FROM HGC_DW.GOLD.DIM_SUCURSAL WHERE CIUDAD = 'La Paz' AND ES_ACTUAL = TRUE

Question (translate to SQL): {request.question}

SQL:"""

        sql_response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": sql_prompt}],
            temperature=0.0,   # 0 = máximo determinismo, menos alucinaciones
            max_tokens=300,
        )
        raw_sql = sql_response.choices[0].message.content
        generated_sql = clean_sql(raw_sql)

        # 2. Ejecutar el SQL en Snowflake
        conn = snowflake.connector.connect(
            account=os.getenv("SNOWFLAKE_ACCOUNT"),
            user=os.getenv("SNOWFLAKE_USER"),
            password=os.getenv("SNOWFLAKE_PASSWORD"),
            role=os.getenv("SNOWFLAKE_ROLE"),
            database=os.getenv("SNOWFLAKE_DATABASE"),
            warehouse=os.getenv("SNOWFLAKE_WAREHOUSE"),
            schema=os.getenv("SNOWFLAKE_SCHEMA", "SILVER"),
        )
        cursor = conn.cursor()
        cursor.execute(generated_sql)
        columns = [col[0] for col in cursor.description]
        rows = cursor.fetchall()
        cursor.close()
        conn.close()

        results = [dict(zip(columns, row)) for row in rows]

        # 3. Resumir los resultados — prompt estricto anti-alucinacion
        data_formatted = ""
        for i, row in enumerate(results[:10], 1):
            row_str = " | ".join(f"{k}: {v}" for k, v in row.items())
            data_formatted += f"  Fila {i}: {row_str}\n"

        summary_prompt = f"""Eres un asistente de datos para HGC (Hermanos Golden Chicken).
El usuario pregunto: "{request.question}"
La consulta SQL retorno {len(results)} fila(s) con estos datos exactos:

{data_formatted}

REGLAS ESTRICTAS:
- Usa SOLO los valores que aparecen en los datos de arriba. Nombres, fechas y numeros exactos.
- NO agregues informacion que no este en esos datos (no inventes totales, no digas cuantas sucursales hay en total si no esta en los datos).
- NO hagas recomendaciones de negocio a menos que el usuario las pida explicitamente.
- Si hay 1 fila: describe esa fila con sus datos exactos.
- Si hay varias filas: menciona las mas relevantes para la pregunta.
- Responde en espanol, maximo 3 oraciones cortas y directas.

Respuesta:"""

        summary_response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": summary_prompt}],
            temperature=0.1,
            max_tokens=250,
        )

        return {
            "question": request.question,
            "sql": generated_sql,
            "rows": len(results),
            "data": results[:20],
            "summary": summary_response.choices[0].message.content,
        }

    except Exception as e:
        return {
            "error": str(e),
            "tip": "Verifica que las credenciales de Snowflake estén en el archivo .env"
        }


# ─── ENDPOINT: ANÁLISIS DE IMAGEN (moondream via Ollama) ─────────────────────

import base64
import httpx
from fastapi import File, UploadFile, Form

@app.post("/chat/vision")
async def analyze_image(
    file: UploadFile = File(...),
    question: str = Form(default="Describe what you see in this image in detail. If there are charts or data, analyze them.")
):
    """
    Recibe una imagen y la analiza con moondream via Ollama.
    """
    try:
        image_bytes = await file.read()

        # ── Comprimir imagen para evitar crash OOM en moondream ───────────────
        try:
            from PIL import Image
            import io as _io
            img = Image.open(_io.BytesIO(image_bytes))
            # Convertir a RGB si tiene canal alpha (PNG transparente)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            # Redimensionar a máximo 768px de ancho manteniendo proporción
            max_w = 768
            if img.width > max_w:
                ratio = max_w / img.width
                img = img.resize((max_w, int(img.height * ratio)), Image.LANCZOS)
            buf = _io.BytesIO()
            img.save(buf, format="JPEG", quality=82)
            image_bytes = buf.getvalue()
        except Exception:
            pass  # Si Pillow falla, intentar con la imagen original

        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        # El prompt se envía en inglés a moondream para mejores resultados
        # luego traducimos con phi3:mini solo si está en inglés
        async with httpx.AsyncClient(timeout=120.0) as http:
            response = await http.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "moondream",
                    "prompt": question if question != "Describe esta imagen en detalle en español. Si contiene gráficos o datos, analiza su contenido." else "Describe what you see in this image in detail. Be specific and accurate.",
                    "images": [image_b64],
                    "stream": False,
                }
            )

        if response.status_code != 200:
            return {"error": f"Error de Ollama: {response.status_code} - {response.text}"}

        result = response.json()
        raw_answer = result.get("response", "").strip()

        if not raw_answer:
            return {"error": "moondream no devolvió respuesta. Intenta con una imagen más clara."}

        # Solo traducir al español, sin reescribir ni inventar
        translate_prompt = f"""Translate this image description to Spanish. 
Keep ALL details exactly as described. Do NOT add, remove or change any information.
Only translate, nothing else.

Text to translate:
{raw_answer}"""

        translation = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": translate_prompt}],
            temperature=0.1,
            max_tokens=600,
        )
        final_answer = translation.choices[0].message.content.strip()

        return {
            "analysis": final_answer,
            "filename": file.filename,
            "raw_english": raw_answer,
        }

    except Exception as e:
        err = str(e)
        if "model" in err.lower() or "not found" in err.lower():
            return {
                "error": "El modelo 'moondream' no está instalado.",
                "tip": "Ejecuta en CMD: ollama pull moondream   (pesa ~900MB)"
            }
        return {"error": err}



# ─── ENDPOINT: ANÁLISIS DE DOCUMENTO (PDF / Word / TXT) ──────────────────────

@app.post("/chat/document")
async def analyze_document(
    file: UploadFile = File(...),
    question: str = Form(default="Resume el contenido de este documento en español, destacando los puntos más importantes.")
):
    """
    Extrae el texto de un PDF, Word o TXT y lo analiza con phi3:mini.
    """
    try:
        content_bytes = await file.read()
        filename = file.filename.lower()
        extracted_text = ""

        # ── PDF ──────────────────────────────────────────────────────────────
        if filename.endswith(".pdf"):
            import fitz  # PyMuPDF
            doc = fitz.open(stream=content_bytes, filetype="pdf")
            for page in doc:
                extracted_text += page.get_text()
            doc.close()

        # ── Word (.docx) ─────────────────────────────────────────────────────
        elif filename.endswith(".docx"):
            import io
            from docx import Document
            doc = Document(io.BytesIO(content_bytes))
            extracted_text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])

        # ── Texto plano ──────────────────────────────────────────────────────
        elif filename.endswith(".txt"):
            extracted_text = content_bytes.decode("utf-8", errors="ignore")

        else:
            return {"error": "Formato no soportado. Usa PDF, DOCX o TXT."}

        if not extracted_text.strip():
            return {"error": "No se pudo extraer texto del documento. Puede estar protegido o ser un PDF de solo imágenes."}

        # Limitar a 3000 caracteres para no saturar el contexto del modelo
        text_chunk = extracted_text[:3000]
        if len(extracted_text) > 3000:
            text_chunk += f"\n\n[... documento truncado, {len(extracted_text)} caracteres totales ...]"

        prompt = f"""Eres un asistente analizando el siguiente documento para el sistema HGC.

DOCUMENTO: {file.filename}
CONTENIDO:
{text_chunk}

TAREA: {question}

Responde en español de forma profesional y estructurada."""

        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
            max_tokens=700,
        )

        return {
            "analysis": completion.choices[0].message.content,
            "filename": file.filename,
            "chars_extracted": len(extracted_text),
        }

    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
