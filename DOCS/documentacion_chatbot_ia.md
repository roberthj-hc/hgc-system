# Documentación Técnica — Módulo de Inteligencia Artificial Conversacional
## Sistema HGC · "El Espejo del Negocio"

**Versión:** 1.0  
**Fecha:** Abril 2026  
**Módulo:** Chat IA + Smart Functions + Vision + Text-to-SQL  

---

## 1. Visión General

El módulo de IA conversacional del sistema HGC es una capa de inteligencia artificial **completamente local** integrada sobre la plataforma de analítica predictiva. Su propósito es democratizar el acceso a los datos: cualquier miembro del equipo puede hacer preguntas en español natural, subir documentos, analizar imágenes de dashboards y recibir respuestas ejecutivas sin necesidad de conocimientos técnicos.

El sistema opera **100% en hardware local** (sin dependencia de APIs externas como OpenAI, Gemini o Claude), garantizando privacidad total de los datos de negocio y costo operativo cero por consulta.

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 15)                     │
│  /chat — Interfaz conversacional                             │
│  SmartButtons.tsx — Botones IA en cada dashboard            │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTP / fetch
┌─────────────────▼───────────────────────────────────────────┐
│              CHAT API (FastAPI · Python · Puerto 8001)        │
│                                                              │
│  POST /chat            → Chat general                        │
│  POST /smart/report    → Reporte ejecutivo IA                │
│  POST /smart/analyst   → Análisis de dashboard               │
│  POST /smart/query     → Text-to-SQL → Snowflake             │
│  POST /chat/vision     → Análisis de imagen                  │
│  POST /chat/document   → Análisis de PDF/Word/TXT            │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
┌──────────▼──────────┐   ┌───────────▼──────────────────────┐
│   OLLAMA (Local)    │   │   SNOWFLAKE (HGC_DW · GOLD)       │
│                     │   │                                   │
│  phi3:mini (3.8B)  │   │  DIM_SUCURSAL, DIM_PRODUCTO       │
│  → Chat, SQL, Docs  │   │  DIM_CLIENTE, DIM_TIEMPO          │
│                     │   │  FACT_VENTAS_DETALLE              │
│  moondream (1.8B)  │   │  MART_VENTAS_HISTORICAS           │
│  → Visión/Imágenes  │   │  MART_RENTABILIDAD_DIAGNOSTICA    │
└─────────────────────┘   │  MART_SUCURSALES_CONSOLIDADO      │
                          └───────────────────────────────────┘
```

---

## 3. Modelos de Lenguaje Utilizados

### 3.1 phi3:mini — Modelo Principal de Lenguaje

| Atributo | Detalle |
|---|---|
| **Modelo** | Microsoft Phi-3 Mini |
| **Parámetros** | 3.8 billones (3.8B) |
| **Tamaño en disco** | ~2.2 GB |
| **Cuantización** | Q4_K_M (4 bits) |
| **Proveedor de runtime** | Ollama v0.x |
| **Puerto** | 11434 (API local) |
| **Protocolo** | OpenAI-compatible REST API |
| **Temperatura chat** | 0.7 (respuestas naturales) |
| **Temperatura SQL** | 0.0 (máximo determinismo) |
| **Temperatura análisis** | 0.4–0.6 |
| **Max tokens** | 512–800 según endpoint |

**¿Por qué phi3:mini?**  
Es el modelo de lenguaje más eficiente en su categoría de tamaño. Desarrollado por Microsoft Research, fue entrenado con énfasis en razonamiento matemático y capacidad de seguir instrucciones complejas. A diferencia de modelos más grandes (llama3, mistral), corre fluidamente en PCs con 8 GB de RAM sin GPU dedicada.

### 3.2 moondream — Modelo de Visión

| Atributo | Detalle |
|---|---|
| **Modelo** | moondream2 |
| **Parámetros** | 1.86 billones (1.86B) |
| **Tamaño en disco** | ~1.7 GB (en dos partes) |
| **Capacidad** | Vision-Language Model (VLM) |
| **Entrada** | Imagen (base64) + texto prompt |
| **Protocolo** | Ollama `/api/generate` con campo `images` |
| **Timeout** | 120 segundos por request |

**¿Por qué moondream?**  
Es el modelo de visión más liviano disponible en Ollama que ofrece razonamiento visual real. Puede describir imágenes, leer texto en capturas de pantalla, identificar elementos de dashboards y tablas. Su pequeño tamaño (~1.7 GB) permite correrlo junto a phi3:mini en el mismo equipo.

---

## 4. Implementación — Endpoints y Funciones

### 4.1 Chat General (`POST /chat`)

Conversación libre con contexto del sistema HGC. El modelo conoce todos los módulos de la plataforma gracias al `SYSTEM_PROMPT` que se inyecta en cada llamada:

```python
SYSTEM_PROMPT = """Eres un asistente inteligente del sistema HGC (El Espejo del Negocio).
HGC es una plataforma de analítica predictiva para una empresa de retail/restaurantes en Bolivia.
El sistema incluye: CLV, Churn, BCG, Canibalización, Rendimiento de sucursales,
elasticidad de precios y eficiencia operativa..."""
```

**Casos de uso:**
- "¿Qué es el churn de clientes?"
- "Explícame la matriz BCG"
- "¿Cómo funciona el modelo de CLV?"
- "¿Qué significa elasticidad de precio?"

---

### 4.2 Reporte Ejecutivo IA (`POST /smart/report`)

Recibe el JSON de datos del dashboard activo y genera un reporte estructurado con:
1. Resumen de situación actual
2. Tres hallazgos clave
3. Dos recomendaciones de acción inmediata

Los SmartButtons en cada dashboard recopilan automáticamente los datos en pantalla y los envían a este endpoint. No requiere interacción manual del usuario para preparar el contexto.

**Parámetros de entrada:**
```json
{
  "module": "CLV Prediction",
  "data": {
    "clvEstimado": 706,
    "tier": "Plata",
    "frecuenciaPedidos": 10,
    "edadCliente": "18-25 años"
  }
}
```

---

### 4.3 Análisis Inteligente (`POST /smart/analyst`)

Similar al reporte pero orientado a responder preguntas específicas del analista sobre los datos del dashboard. Funciona en modo libre (interpretación general) o en modo pregunta-respuesta.

---

### 4.4 Text-to-SQL con Snowflake (`POST /smart/query`)

Este es el endpoint más técnico. Convierte lenguaje natural en SQL ejecutable sobre el Data Warehouse real de HGC en Snowflake.

**Flujo de ejecución en 4 pasos:**

```
Pregunta usuario (español natural)
         ↓
[1] phi3:mini genera SQL (temperature=0.0)
    Prompt contiene esquema real verificado de HGC_DW.GOLD
         ↓
[2] clean_sql() sanitiza el SQL generado:
    - Quita bloques markdown (```sql```)
    - Extrae solo desde SELECT/WITH
    - Elimina caracteres no-ASCII (acentos)
    - Autocorrige columnas truncadas (diccionario)
    - Deduplica LIMIT duplicados
         ↓
[3] Ejecuta en Snowflake vía snowflake-connector-python
    Schema: HGC_DW.GOLD
         ↓
[4] phi3:mini resume resultados en español gerencial
    (temperature=0.4, basado en datos reales devueltos)
```

**Tablas habilitadas para consulta:**

| Tabla | Descripción |
|---|---|
| `DIM_SUCURSAL` | Catálogo de sucursales con fecha apertura, ciudad, gerente |
| `DIM_PRODUCTO` | Catálogo de productos con categoría y precio histórico |
| `DIM_CLIENTE` | Clientes con segmento, género y rango de edad |
| `DIM_TIEMPO` | Calendario con año (`ANIO`), mes, trimestre, feriados |
| `FACT_VENTAS_DETALLE` | Transacciones detalladas de ventas |
| `MART_VENTAS_HISTORICAS` | Ventas consolidadas por sucursal y fecha |
| `MART_SUCURSALES_CONSOLIDADO` | KPIs de sucursal: tickets, ticket promedio, mermas |
| `MART_RENTABILIDAD_DIAGNOSTICA` | Rentabilidad con costos, comisiones y utilidad neta |

**Sistema de autocorrección de columnas (`COLUMN_CORRECTIONS`):**

phi3:mini, al ser un modelo pequeño, a veces trunca nombres de columna largos. Se implementó un diccionario de correcciones automáticas:

```python
"ANO" → "ANIO"          # El año real en Snowflake es ANIO
"NOM" → "NOMBRE_PRODUCTO"
"CANT" → "CANTIDAD_VENDIDA"
"MES_NUMERO" → "MES"
"NOMBRE_DIA" → "DIA_SEMANA"
```

---

### 4.5 Análisis de Imágenes (`POST /chat/vision`)

Permite subir capturas de pantalla, gráficos o cualquier imagen para que moondream las analice.

**Dos formas de subir imágenes:**
1. **Ctrl+V** — Pegar desde el portapapeles (screenshot directo)
2. **Botón 📎** — Seleccionar archivo PNG/JPG desde el disco

**Proceso interno:**
```python
# 1. Recibe imagen y la comprime para evitar OOM
img = Image.open(BytesIO(image_bytes))
img = img.resize((768, auto_height))  # Máx 768px ancho
img.save(buf, format="JPEG", quality=82)

# 2. Convierte a base64 y envía a moondream
response = httpx.post("http://localhost:11434/api/generate",
    json={"model": "moondream", "prompt": question, "images": [b64]})

# 3. phi3:mini traduce la respuesta al español (sin modificar contenido)
```

**Limitación conocida:** moondream es un modelo pequeño (1.8B). Funciona mejor con imágenes enfocadas (una tabla, un gráfico específico) que con dashboards completos. Se recomienda usar `Win+Shift+S` para recortar la sección de interés antes de pegar.

---

### 4.6 Análisis de Documentos (`POST /chat/document`)

Soporta PDF, Word (.docx) y texto plano (.txt). El backend extrae el texto y lo procesa con phi3:mini.

**Librerías de extracción:**
- **PDF:** PyMuPDF (`fitz`) — extrae texto nativo de PDFs
- **Word:** python-docx — extrae párrafos del documento
- **TXT:** decodificación UTF-8 directa

**Límite de contexto:** 3,000 caracteres por llamada (ajustado al contexto de phi3:mini). Documentos largos se truncan con aviso al usuario.

---

## 5. Stack Tecnológico Completo

### Backend (Chat API)
| Componente | Tecnología | Versión |
|---|---|---|
| Framework web | FastAPI | Latest |
| Runtime Python | Python | 3.13 (venv) |
| Servidor ASGI | Uvicorn | Latest |
| Cliente LLM | openai (compatible Ollama) | Latest |
| Conector BD | snowflake-connector-python | Latest |
| Visión HTTP | httpx | Latest |
| PDF | PyMuPDF | Latest |
| Word | python-docx | Latest |
| Imágenes | Pillow | Latest |
| Variables entorno | python-dotenv | Latest |

### Modelos IA (Ollama)
| Modelo | Uso | RAM requerida |
|---|---|---|
| phi3:mini (3.8B) | Chat, SQL, Reportes, Documentos | ~2.5 GB |
| moondream (1.8B) | Análisis de imágenes | ~2.0 GB |

### Frontend (Next.js)
| Componente | Archivo |
|---|---|
| Página de chat | `app/chat/page.tsx` |
| Botones inteligentes | `components/smart-buttons.tsx` |

---

## 6. SmartButtons — Integración en Dashboards

Se creó el componente reutilizable `SmartButtons.tsx` que se integró en **todos los módulos del sistema**:

| Módulo | Ruta | Datos enviados al IA |
|---|---|---|
| CLV Prediction | `/predictions/clv` | CLV estimado, tier, frecuencia, antigüedad |
| BCG Clustering | `/predictions/bcg-clustering` | Cuadrantes, productos por categoría |
| Churn Prediction | `/predictions/churn` | Score de riesgo, factores de abandono |
| Cannibalization | `/predictions/cannibalization` | Productos cannibalizados, impacto en ventas |
| Branch Performance | `/predictions/branch-performance` | Rentabilidad por sucursal |
| Eficiencia Operativa | `/econometrics/efficiency-monitor` | Score eficiencia, brecha de ingresos |
| Optimizador de Precios | `/econometrics/price-optimizer` | Elasticidad, precio sugerido, ingresos |
| Espejo del Negocio | `/time-series/mirror-dashboard` | Ventas, mermas, ticket por sucursal |
| Detective Rentabilidad | `/time-series/profit-detective` | Cascada de rentabilidad, utilidad neta |
| Simulador CBBA | `/time-series/cbba-simulator` | Marketing, precio, empleados, proyección |

Cada módulo tiene **3 botones:**
- 📋 **Generar Reporte** → `/smart/report`
- 🔍 **Analizar con IA** → `/smart/analyst`
- ❄️ **Consultar BD** → `/smart/query`

---

## 7. Evaluación del Sistema

### 7.1 Mejora en Decisiones Clave

El sistema convierte datos técnicos en lenguaje ejecutivo. Antes, un gerente necesitaba pedir a un analista que interpretara un dashboard de CLV. Ahora hace clic en "Analizar con IA" y en 15–30 segundos tiene un análisis con recomendaciones concretas.

**Impacto medible:** El tiempo desde "ver un dato" hasta "tomar una decisión informada" se reduce de días (ciclo analista → reporte → reunión) a segundos.

---

### 7.2 Retorno Económico (ROI)

| Concepto | Costo tradicional (externo) | Costo HGC IA |
|---|---|---|
| API calls (GPT-4) | $0.01–$0.05 por consulta | **$0.00** (local) |
| Servidor cloud IA | $50–200/mes | **$0.00** (PC local) |
| Costo por reporte ejecutivo | $0.10–$0.50 | **$0.00** |
| Costo por query SQL natural | $0.05–$0.20 | **$0.00** |

El único costo fue el tiempo de implementación. La operación diaria tiene **costo marginal cero**, independientemente del volumen de consultas.

**ROI proyectado:** Si el equipo hace 50 consultas/día (reportes + queries + análisis), ahorra ~$150–300/mes respecto a soluciones cloud equivalentes.

---

### 7.3 Precisión del Sistema

| Función | Precisión observada | Limitaciones |
|---|---|---|
| Chat general (HGC context) | Alta — phi3:mini conoce el dominio gracias al system prompt | Respuestas largas pueden divagar |
| Generación de reportes | Alta — estructura fija garantiza coherencia | Depende de calidad de datos del dashboard |
| Text-to-SQL (consultas simples) | Media-Alta — ~85% en 1er intento | Joins complejos o columnas desconocidas fallan |
| Análisis de imágenes | Media — moondream 1.8B es limitado | Imágenes densas (dashboards completos) confunden al modelo |
| Análisis de documentos | Alta para PDFs con texto | PDFs escaneados (solo imagen) no funcionan |

**Mecanismos de mejora de precisión implementados:**
- `temperature=0.0` para SQL (máximo determinismo)
- Prompt con esquema real verificado desde Snowflake
- Diccionario de autocorrección de 20+ columnas conocidas
- Compresión de imágenes a 768px para evitar crashes

---

### 7.4 Reducción de Errores y Pérdidas

**Errores de SQL corregidos automáticamente:**
- Bloques markdown en SQL (` ```sql ``` `) → eliminados
- Acentos en nombres de columna (`AÑO`) → reemplazados (`ANIO`)
- `LIMIT` duplicado → deduplicado
- Columnas truncadas (`NOM`, `CANT`) → expandidas al nombre real

**Errores de interpretación de imágenes:**
- Imagen demasiado grande → crash OOM de moondream → ahora se redimensiona a 768px antes de enviar
- Respuesta en inglés reinterpretada por phi3:mini → ahora se traduce literalmente sin reescribir

---

### 7.5 Velocidad de Respuesta

| Función | Tiempo típico | Método anterior |
|---|---|---|
| Chat general | 10–20 segundos | N/A |
| Generar reporte | 15–35 segundos | 2–4 horas (analista manual) |
| Análisis de dashboard | 15–30 segundos | 1–2 horas |
| Query SQL natural | 25–60 segundos | Requería conocer SQL + 10–30 min |
| Análisis de imagen | 30–90 segundos | Reunión/llamada de 30 min |
| Análisis de documento PDF | 20–40 segundos | Lectura manual 20–60 min |

> **Nota:** Los tiempos son altos comparados con soluciones cloud (GPT-4 responde en 2–5s) porque phi3:mini corre en CPU sin GPU dedicada. En un equipo con GPU NVIDIA, los tiempos se reducen 5–10×.

---

### 7.6 Automatización de Procesos

**Procesos que antes eran manuales y ahora son automáticos:**

1. **Generación de reportes ejecutivos** — El analista preparaba slides/Word. Ahora el botón "Generar Reporte" produce el contenido en segundos con los datos actuales del dashboard.

2. **Consulta de datos históricos** — Requería abrir Snowflake, escribir SQL, esperar resultados, interpretar. Ahora se escribe en español y el sistema hace todo el ciclo.

3. **Interpretación de gráficos** — Las capturas de pantalla de dashboards ahora pueden "explicarse" pegando la imagen en el chat.

4. **Lectura de documentos** — PDFs de proveedores, contratos o reportes externos se pueden subir y el IA extrae los puntos relevantes.

---

### 7.7 Facilidad para Entender el Resultado (Explicabilidad)

El sistema está diseñado para **máxima transparencia:**

- **Reporte con estructura fija:** Siempre incluye (1) situación actual, (2) hallazgos clave, (3) recomendaciones. El gerente sabe exactamente dónde buscar la información.

- **SQL visible:** En modo Base de Datos, el usuario puede ver el SQL exacto que se ejecutó en Snowflake. No es una "caja negra" — puede verificar que la pregunta se interpretó correctamente.

- **Datos de contexto explícitos:** Los SmartButtons pasan los datos del dashboard al modelo. El análisis no es genérico — está basado en los números reales que el usuario está viendo en pantalla.

- **Respuestas en español gerencial:** El sistema prompt fuerza respuestas concisas, profesionales y orientadas al negocio, sin jerga técnica.

---

### 7.8 Uso Real por el Equipo

**Perfil de usuario objetivo:**

| Rol | Uso principal | Frecuencia esperada |
|---|---|---|
| Gerente General | Reportes rápidos, preguntas de alto nivel | 5–10 consultas/día |
| Analista de Negocio | Queries SQL, análisis de dashboards | 20–30 consultas/día |
| Gerente de Sucursal | Preguntas sobre su sucursal específica | 3–5 consultas/día |
| Equipo Comercial | Análisis de productos BCG, CLV de clientes | 10–15 consultas/día |

**Barreras de adopción identificadas:**
- Velocidad (15–60s) puede desincentivar uso frecuente → mitigable con GPU
- Usuarios no saben qué preguntar → documentar ejemplos de queries por módulo
- Resultados inconsistentes en SQL complejo → guiar usuarios a preguntas simples

**Facilitadores de adopción:**
- Interfaz en español
- Botones integrados en cada dashboard (no requiere ir al chat)
- Resultados inmediatos sin necesidad de técnicos intermediarios

---

## 8. Variables de Entorno Requeridas

```env
# Snowflake
SNOWFLAKE_ACCOUNT=xxx.snowflakecomputing.com
SNOWFLAKE_USER=usuario
SNOWFLAKE_PASSWORD=contraseña
SNOWFLAKE_ROLE=SYSADMIN
SNOWFLAKE_DATABASE=HGC_DW
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_SCHEMA=GOLD
```

---

## 9. Requisitos de Sistema

| Componente | Mínimo | Recomendado |
|---|---|---|
| RAM | 8 GB | 16 GB |
| CPU | Intel i5 / AMD Ryzen 5 | Intel i7 / Ryzen 7 |
| GPU | No requerida | NVIDIA 8GB+ VRAM |
| Disco | 10 GB libres | 20 GB libres |
| OS | Windows 10/11 | Windows 11 |
| Python | 3.13 | 3.13 |
| Node.js | 18+ | 20+ |

---

## 10. Cómo Iniciar el Módulo IA

```bash
# 1. Verificar que Ollama esté corriendo (servicio de fondo en Windows)
# Puerto 11434 debe estar activo

# 2. Iniciar Chat API
cd chat-api
.\venv\Scripts\python.exe -m uvicorn main:app --reload --port 8001

# 3. Verificar en: http://localhost:8001/
# Respuesta esperada: {"status": "HGC Chat API running", "model": "phi3:mini"}

# 4. Acceder al chat
# http://localhost:3000/chat
```

**Modelos Ollama requeridos:**
```bash
ollama pull phi3:mini    # ~2.2 GB — Modelo principal
ollama pull moondream    # ~1.7 GB — Análisis de imágenes
```

---

## 11. Extensiones Futuras Recomendadas

| Funcionalidad | Tecnología sugerida | Impacto |
|---|---|---|
| RAG (base de conocimiento propia) | ChromaDB + sentence-transformers | Alto — el modelo "recuerda" documentos propios |
| GPU acceleration | Ollama + NVIDIA CUDA | Alto — reduce tiempos de 30s a 3s |
| Historial de conversaciones | SQLite o PostgreSQL | Medio — persistencia entre sesiones |
| Modelo más preciso | llama3.1:8b o mistral:7b | Medio — mejor SQL, menos errores |
| Exportar reportes a PDF | reportlab o weasyprint | Medio — utilidad directa para gerentes |
| Alertas automáticas | Cron job + /smart/analyst | Alto — análisis diario automático |
| Modelo de visión mejorado | llava:7b (4.5 GB) | Medio — mejor análisis de dashboards |

---

*Documento generado automáticamente — Sistema HGC · Módulo IA Conversacional · Abril 2026*
