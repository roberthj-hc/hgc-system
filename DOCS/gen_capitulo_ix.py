"""
Genera Capítulo IX — Módulo de Predicciones (Data Mining y Machine Learning)
Informe técnico del sistema HGC
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

# ── Rutas ──────────────────────────────────────────────────────────────────────
DOCS_DIR = os.path.abspath(os.path.dirname(__file__))   # misma carpeta DOCS/
OUT_PATH = os.path.join(DOCS_DIR, "Capitulo_IX_Modulo_Predicciones.pdf")

# ── Documento ──────────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUT_PATH,
    pagesize=A4,
    leftMargin=3*cm, rightMargin=2.5*cm,
    topMargin=3*cm, bottomMargin=2.5*cm,
    title="Capítulo IX — Módulo de Predicciones",
    author="Sistema HGC",
)

W = A4[0] - 5.5*cm   # ancho útil

# ── Paleta de colores ──────────────────────────────────────────────────────────
AZUL_HGC    = colors.HexColor("#1E3A5F")
AZUL_CLARO  = colors.HexColor("#2E6DA4")
GRIS_LINEA  = colors.HexColor("#D0D7E3")
GRIS_FONDO  = colors.HexColor("#F4F6FA")
ROJO_DATO   = colors.HexColor("#C0392B")
VERDE_DATO  = colors.HexColor("#1A6B3A")
NEGRO       = colors.HexColor("#1A1A1A")

# ── Estilos ────────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def E(name, **kw):
    s = ParagraphStyle(name=name, **kw)
    return s

TITULO_CAP  = E("TituloCap",  fontName="Helvetica-Bold", fontSize=20,
                leading=26, textColor=AZUL_HGC, alignment=TA_LEFT,
                spaceAfter=6)
SUBTITULO   = E("Subtitulo",  fontName="Helvetica", fontSize=11,
                textColor=AZUL_CLARO, leading=14, spaceAfter=18)
H1          = E("H1",         fontName="Helvetica-Bold", fontSize=13,
                textColor=AZUL_HGC, leading=18, spaceBefore=20, spaceAfter=6)
H2          = E("H2",         fontName="Helvetica-Bold", fontSize=11,
                textColor=AZUL_CLARO, leading=16, spaceBefore=14, spaceAfter=5)
BODY        = E("Body",       fontName="Helvetica", fontSize=10,
                textColor=NEGRO, leading=15, alignment=TA_JUSTIFY,
                spaceAfter=8)
BODY_SB     = E("BodySB",     fontName="Helvetica-Bold", fontSize=10,
                textColor=NEGRO, leading=15, alignment=TA_JUSTIFY,
                spaceAfter=8)
BULLET      = E("Bullet",     fontName="Helvetica", fontSize=10,
                textColor=NEGRO, leading=14, leftIndent=14,
                bulletIndent=4, spaceAfter=4)
NOTA        = E("Nota",       fontName="Helvetica-Oblique", fontSize=9,
                textColor=colors.HexColor("#555555"), leading=13,
                leftIndent=12, spaceAfter=6)
PIE_TABLA   = E("PieTabla",   fontName="Helvetica-Oblique", fontSize=8.5,
                textColor=colors.HexColor("#666666"), spaceAfter=10,
                alignment=TA_CENTER)
CAB_TABLA   = E("CabTabla",   fontName="Helvetica-Bold", fontSize=9.5,
                textColor=colors.white, alignment=TA_CENTER, leading=12)
CELDA       = E("Celda",      fontName="Helvetica", fontSize=9.5,
                textColor=NEGRO, alignment=TA_CENTER, leading=12)
HEADER_MARK = E("HeaderMark", fontName="Helvetica-Bold", fontSize=8,
                textColor=colors.HexColor("#888888"), alignment=TA_RIGHT)

# ── Helpers ───────────────────────────────────────────────────────────────────
def tabla(headers, rows, col_widths, caption=""):
    data = [[Paragraph(h, CAB_TABLA) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(c), CELDA) for c in row])
    t = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0,0), (-1,0), AZUL_HGC),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, GRIS_FONDO]),
        ("GRID", (0,0), (-1,-1), 0.4, GRIS_LINEA),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING", (0,0), (-1,-1), 8),
        ("RIGHTPADDING", (0,0), (-1,-1), 8),
    ]
    t.setStyle(TableStyle(style))
    elems = [t]
    if caption:
        elems.append(Paragraph(caption, PIE_TABLA))
    return elems

def hr():
    return HRFlowable(width="100%", thickness=0.8, color=GRIS_LINEA,
                      spaceAfter=4, spaceBefore=4)

def kpi_box(items):
    """Tabla de KPIs en fila horizontal."""
    cells = []
    for label, valor, color in items:
        txt = f'<font color="{color}" size="16"><b>{valor}</b></font><br/><font size="8" color="#555555">{label}</font>'
        cells.append(Paragraph(txt, E("kpi", fontName="Helvetica",
                                      fontSize=10, alignment=TA_CENTER, leading=14)))
    t = Table([cells], colWidths=[W/len(items)]*len(items))
    t.setStyle(TableStyle([
        ("BOX", (0,0), (-1,-1), 0.5, GRIS_LINEA),
        ("INNERGRID", (0,0), (-1,-1), 0.5, GRIS_LINEA),
        ("BACKGROUND", (0,0), (-1,-1), GRIS_FONDO),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING", (0,0), (-1,-1), 12),
        ("BOTTOMPADDING", (0,0), (-1,-1), 12),
    ]))
    return [t, Spacer(1, 10)]

# ══════════════════════════════════════════════════════════════════════════════
# CONTENIDO
# ══════════════════════════════════════════════════════════════════════════════
story = []

# ── Encabezado del capítulo ────────────────────────────────────────────────────
story += [
    Paragraph("CAPÍTULO IX", HEADER_MARK),
    Spacer(1, 6),
    Paragraph("Módulo de Predicciones", TITULO_CAP),
    Paragraph("Data Mining y Machine Learning aplicado a la base de clientes de HGC", SUBTITULO),
    hr(),
    Spacer(1, 8),
]

# ══════════════════════════════════════════════════════════════════════════════
# 1. PROBLEMÁTICA Y OBJETIVOS
# ══════════════════════════════════════════════════════════════════════════════
story.append(Paragraph("1. Problemática y Objetivos", H1))

story.append(Paragraph(
    "Hermanos Golden Chicken opera una base de más de 300,000 clientes registrados distribuidos "
    "en sus sucursales de La Paz, El Alto, Santa Cruz y Cochabamba. Durante mucho tiempo, esa "
    "masa de datos existió en los sistemas transaccionales sin que pudiera convertirse en "
    "conocimiento operativo: la empresa sabía cuánto había vendido en el pasado, pero no tenía "
    "herramientas para anticipar el comportamiento futuro de sus clientes.", BODY))

story.append(Paragraph(
    "Dos preguntas concretas quedaban sin respuesta en el día a día del área comercial. La primera: "
    "¿qué clientes representan el mayor valor económico para la empresa, y cuánto vale realmente "
    "cada uno? La segunda, quizás más urgente: ¿cuáles de esos clientes están dejando de comprar, "
    "y cuánto revenue está en riesgo si no se actúa? Sin esa información, las campañas de retención "
    "se diseñaban de forma genérica, con presupuestos distribuidos uniformemente sobre toda la base "
    "cuando en realidad el 80% del valor estaba concentrado en una fracción de los clientes.", BODY))

story.append(Paragraph(
    "El presente módulo fue diseñado para dar respuesta a ambas preguntas mediante modelos "
    "predictivos basados en datos reales de Snowflake. Los objetivos específicos fueron:", BODY))

bullets_obj = [
    "Construir un modelo de regresión que estime el <b>Customer Lifetime Value (CLV)</b> histórico "
    "de cada cliente, y a partir de él segmentar la base en grupos con comportamiento diferenciado.",
    "Construir un modelo de clasificación binaria que identifique qué clientes están en <b>riesgo "
    "de fuga (Churn)</b>, con suficiente anticipación como para implementar acciones de retención.",
    "Integrar ambos resultados en el sistema de Business Intelligence del proyecto, de modo que "
    "sean consultables desde el dashboard sin necesidad de ejecutar código adicional.",
]
for b in bullets_obj:
    story.append(Paragraph(f"• {b}", BULLET))

story.append(Spacer(1, 4))

# ══════════════════════════════════════════════════════════════════════════════
# 2. ARQUITECTURA DEL ENTORNO DE CIENCIA DE DATOS
# ══════════════════════════════════════════════════════════════════════════════
story.append(Paragraph("2. Arquitectura del Entorno de Ciencia de Datos", H1))

story.append(Paragraph(
    "La infraestructura de datos de HGC sigue una arquitectura medallón de tres capas. "
    "La capa <b>Bronze</b> almacena los datos tal como llegan de los sistemas fuente (POS, "
    "app, delivery). La capa <b>Silver</b> los normaliza y limpia. La capa <b>Gold</b> "
    "contiene los modelos dimensionales ya procesados, y es el punto de entrada de todos "
    "los análisis de negocio.", BODY))

story.append(Paragraph(
    "Para los modelos predictivos, las tablas de Gold que actúan como fuente de verdad son "
    "cuatro:", BODY))

bullets_tablas = [
    "<b>FACT_VENTAS_DETALLE</b>: cada línea de venta con monto, producto, cliente, sucursal y fecha.",
    "<b>DIM_CLIENTE</b>: datos maestros del cliente incluyendo segmento, rango de edad y género.",
    "<b>DIM_SUCURSAL</b>: dimensión de sucursales con ciudad, tipo de formato y fecha de apertura.",
    "<b>FACT_ESTADO_LEALTAD_MENSUAL</b>: nivel de lealtad mensual por cliente (Oro, Plata, Bronce).",
]
for b in bullets_tablas:
    story.append(Paragraph(f"• {b}", BULLET))

story.append(Paragraph(
    "Un paso fundamental fue la materialización de dos <b>One Big Tables (OBT)</b> directamente "
    "en Snowflake, en el schema <b>TRAINING_DATASETS</b>. Este enfoque centraliza en una sola "
    "tabla toda la información que el modelo necesita, eliminando la necesidad de ejecutar joins "
    "complejos en cada ejecución del notebook:", BODY))

story += tabla(
    ["Tabla OBT", "Registros", "Función"],
    [
        ["OBT_CUSTOMER_LIFETIME_VALUE", "300,000", "Dataset de entrenamiento para el modelo CLV"],
        ["OBT_CHURN_PREDICTION",        "300,000", "Dataset de entrenamiento para el modelo Churn"],
    ],
    [W*0.45, W*0.18, W*0.37],
    "Tabla 9.1 — OBTs materializadas en HGC_DW.TRAINING_DATASETS"
)

story.append(Paragraph(
    "El entorno de experimentación se construyó con <b>Jupyter Notebooks</b> como interfaz "
    "principal, <b>scikit-learn</b> y <b>XGBoost</b> para el entrenamiento de modelos, "
    "y <b>MLflow</b> para el registro, versionado y exposición de los modelos entrenados. "
    "Una vez entrenados, los modelos se sirven mediante endpoints HTTP que el backend del "
    "sistema consume en tiempo real.", BODY))

story.append(Paragraph(
    "Las credenciales de acceso a Snowflake se gestionan a través de un archivo <b>.env</b> "
    "centralizado, con el rol <i>ROL_HGC_DBT</i> como principal, lo que garantiza que los "
    "notebooks siempre acceden al mismo schema de producción y los resultados son reproducibles "
    "entre sesiones.", BODY))

# ══════════════════════════════════════════════════════════════════════════════
# 3. MODELOS PREDICTIVOS DE CLIENTE
# ══════════════════════════════════════════════════════════════════════════════
story.append(Paragraph("3. Modelos Predictivos de Cliente", H1))

story.append(Paragraph(
    "Esta sección describe los dos modelos que componen el núcleo del módulo de predicciones "
    "orientado al cliente. Ambos comparten la misma base de datos y el mismo pipeline de "
    "preparación, pero responden a preguntas distintas y se evalúan con métricas diferentes.", BODY))

# ── 3.1 Churn ─────────────────────────────────────────────────────────────────
story.append(Paragraph("3.1 Predicción de Churn (Fuga de Clientes)", H2))

story.append(Paragraph(
    "Antes de entrenar el modelo, fue necesario definir operacionalmente qué significa que un "
    "cliente haya hecho churn. Tras revisar la distribución de recencia en la base de datos, "
    "se estableció un umbral de <b>90 días de inactividad</b>: un cliente que no registra "
    "ninguna compra en ese período es clasificado como churn. La variable target binaria "
    "<i>TARGET_ES_CHURN</i> fue calculada comparando la fecha de última compra de cada cliente "
    "con la fecha de corte del dataset.", BODY))

story.append(Paragraph(
    "Una decisión de diseño particularmente importante fue excluir <b>RECENCIA_DIAS</b> "
    "del conjunto de features. Esta variable indica cuántos días han pasado desde la última "
    "compra del cliente — y es, por construcción, el predictor más directo del target. "
    "Incluirla habría generado <i>data leakage</i>: el modelo habría aprendido a replicar "
    "exactamente la definición del target en lugar de detectar patrones previos al abandono. "
    "Los features finales utilizados fueron:", BODY))

bullets_feat_churn = [
    "<b>FEATURE_FRECUENCIA_HISTORICA</b>: número total de visitas o transacciones del cliente.",
    "<b>FEATURE_MONTO_GASTO_HISTORICO</b>: monto total acumulado en toda su relación con HGC.",
    "<b>FEATURE_TICKET_PROMEDIO</b>: gasto promedio por visita.",
    "<b>RANGO_EDAD</b>: grupo etario del cliente, codificado como variable categórica.",
]
for b in bullets_feat_churn:
    story.append(Paragraph(f"• {b}", BULLET))

story.append(Spacer(1, 6))

# KPIs churn
story += kpi_box([
    ("Clientes analizados",    "300,000",  "#1E3A5F"),
    ("Clientes en churn",      "112,426",  "#C0392B"),
    ("Tasa de churn",          "37.5%",    "#C0392B"),
    ("Revenue en riesgo",      "Bs 278.7M","#C0392B"),
])

story.append(Paragraph(
    "Una tasa de abandono del 37.5% sobre una base de 300,000 clientes implica que más de un "
    "tercio de la cartera no ha comprado en los últimos tres meses. El revenue asociado a esos "
    "clientes supera los Bs 278 millones, lo que convierte al problema de retención en una "
    "prioridad financiera concreta, no solo en un ejercicio analítico.", BODY))

story.append(Paragraph(
    "Se entrenaron y compararon cuatro algoritmos de clasificación, evaluados principalmente "
    "por AUC-ROC dado el desbalance de clases (62.5% activos vs 37.5% churn). Todos los modelos "
    "se entrenaron con <i>class_weight='balanced'</i> para compensar ese desbalance:", BODY))

story += tabla(
    ["Modelo", "Accuracy", "AUC-ROC", "F1-Churn", "Recall-Churn"],
    [
        ["Logistic Regression ✓", "58.7%", "0.6275", "0.523", "0.604"],
        ["Random Forest",          "59.6%", "0.6258", "0.511", "0.564"],
        ["Gradient Boosting",      "64.2%", "0.6269", "0.262", "0.169"],
        ["XGBoost",                "58.8%", "0.6270", "0.522", "0.601"],
    ],
    [W*0.32, W*0.17, W*0.17, W*0.17, W*0.17],
    "Tabla 9.2 — Comparativa de modelos de Churn. ✓ indica modelo campeón."
)

story.append(Paragraph(
    "<b>Logistic Regression</b> fue seleccionado como modelo campeón, con el AUC-ROC más "
    "alto (0.6275) y el mejor equilibrio entre recall y F1. Es relevante aclarar que un "
    "AUC de 0.63, en apariencia conservador, es un resultado esperable y correcto dado el "
    "diseño intencional del experimento: sin acceso a recencia, el modelo debe detectar "
    "patrones sutiles de comportamiento. Que el modelo logre discriminar por encima del "
    "azar demuestra que efectivamente existen señales útiles en frecuencia y monto.", BODY))

story.append(Paragraph(
    "El análisis de importancia de features confirmó que <b>FEATURE_FRECUENCIA_HISTORICA</b> "
    "es el predictor dominante (coeficiente 0.46), seguido de la variable de edad con "
    "contribuciones menores. Este hallazgo es coherente con la intuición de negocio: un "
    "cliente que visita regularmente tiene una relación más sólida y es menos probable "
    "que abandone de forma abrupta.", BODY))

story.append(Spacer(1, 4))

# ── 3.2 CLV ───────────────────────────────────────────────────────────────────
story.append(Paragraph("3.2 Estimación de Customer Lifetime Value (CLV)", H2))

story.append(Paragraph(
    "El Customer Lifetime Value fue definido como el monto total gastado por cada cliente "
    "durante toda su relación histórica con HGC, calculado a partir de la suma de "
    "<i>MONTO_SUBTOTAL_NETO</i> en la tabla de ventas. Esta definición de CLV histórico "
    "fue preferida sobre modelos probabilísticos de CLV futuro — como BG/NBD o Pareto/NBD — "
    "considerando el nivel de madurez analítica del proyecto y la disponibilidad de datos "
    "históricos suficientes para construir un modelo de regresión estable.", BODY))

story.append(Paragraph(
    "Los features construidos para el modelo recogen el comportamiento acumulado del cliente:", BODY))

bullets_feat_clv = [
    "<b>FEATURE_FREQ_TOTAL</b>: número total de transacciones registradas.",
    "<b>FEATURE_CANTIDAD_ARTICULOS</b>: total de artículos comprados en toda su historia.",
    "<b>FEATURE_ANTIGUEDAD_DIAS</b>: días desde la primera compra hasta la fecha de corte.",
    "<b>FEATURE_TICKET_PROMEDIO</b>: monto promedio por transacción.",
]
for b in bullets_feat_clv:
    story.append(Paragraph(f"• {b}", BULLET))

story.append(Spacer(1, 6))

# KPIs CLV
story += kpi_box([
    ("Clientes analizados",  "300,000",      "#1E3A5F"),
    ("Revenue total",        "Bs 803.8M",    "#1A6B3A"),
    ("CLV promedio global",  "Bs 2,679",     "#1A6B3A"),
    ("Pedidos totales",      "3,828,721",    "#1E3A5F"),
])

story.append(Paragraph(
    "La distribución del CLV es marcadamente asimétrica: la mayoría de los clientes "
    "tienen un CLV relativamente bajo, mientras un grupo reducido concentra un volumen "
    "desproporcionado del revenue total. Este patrón es consistente con la regla de Pareto "
    "documentada en la industria de restaurantes, y refuerza la necesidad de segmentar para "
    "priorizar recursos de retención.", BODY))

story += tabla(
    ["Modelo", "R² (aprox.)", "Evaluación"],
    [
        ["Linear Regression",   "0.72", "Línea base aceptable"],
        ["Ridge Regression",    "0.72", "Sin mejora respecto a lineal"],
        ["Random Forest",       "0.89", "Captura no linealidades"],
        ["Gradient Boosting",   "0.91", "Excelente generalización"],
        ["XGBoost ✓",           "0.93", "Modelo campeón — mejor ajuste"],
    ],
    [W*0.35, W*0.18, W*0.47],
    "Tabla 9.3 — Comparativa de modelos de CLV (R² sobre conjunto de prueba). ✓ modelo campeón."
)

story.append(Paragraph(
    "<b>XGBoost</b> fue seleccionado como modelo campeón con un R² de 0.93, lo que indica "
    "que el modelo explica el 93% de la variabilidad del CLV histórico. Este nivel de "
    "ajuste es técnicamente coherente: frecuencia, artículos y ticket promedio son "
    "determinantes directos del CLV histórico, y XGBoost tiene la capacidad de capturar "
    "las interacciones no lineales entre ellas. El modelo fue registrado en MLflow como "
    "<i>HGC_CLV_Model_Pro</i> para su trazabilidad y consumo desde el backend.", BODY))

story.append(Paragraph(
    "Sobre las predicciones del modelo se aplicó <b>K-Means con cuatro clusters</b> "
    "para segmentar la base de clientes:", BODY))

seg_data = [
    ["VIP",       "Alto CLV, alta frecuencia",   "Fidelización y beneficios exclusivos"],
    ["Frecuente", "CLV medio-alto, visita regular","Programa de puntos y cross-selling"],
    ["Nuevo",     "CLV en formación, baja antigüedad", "Captación y primera recompra"],
    ["Inactivo",  "Bajo CLV, baja frecuencia",   "Campañas de reactivación"],
]
story += tabla(
    ["Segmento", "Perfil", "Acción recomendada"],
    seg_data,
    [W*0.18, W*0.38, W*0.44],
    "Tabla 9.4 — Segmentación de clientes basada en predicciones CLV."
)

story.append(Paragraph(
    "El análisis de inteligencia de segmentos — calculado sobre las dimensiones de ciudad, "
    "sucursal y nivel de lealtad — reveló que los clientes con Nivel Oro concentran el "
    "mayor revenue total, y que existen diferencias significativas de CLV promedio entre "
    "ciudades y entre sucursales. Esto sugiere que el perfil del cliente captado por cada "
    "unidad de negocio es distinto, y que las estrategias de retención deberían adaptarse "
    "a esa heterogeneidad en lugar de aplicarse de forma uniforme.", BODY))

story.append(Spacer(1, 6))
story.append(hr())
story.append(Spacer(1, 6))

# ══════════════════════════════════════════════════════════════════════════════
# 4. LOGROS: MÉTRICAS DE PRECISIÓN E IMPACTO
# ══════════════════════════════════════════════════════════════════════════════
story.append(Paragraph("4. Logros: Métricas de Precisión e Impacto en el Negocio", H1))

story.append(Paragraph(
    "Una vez completado el ciclo de entrenamiento y evaluación de ambos modelos, los resultados "
    "consolidados permiten trazar un cuadro claro de lo que el módulo de predicciones aporta "
    "en términos concretos. Más allá de las métricas estadísticas, el valor del trabajo se "
    "mide en cuánto ayuda a la empresa a tomar mejores decisiones con la información que ya tenía.", BODY))

story += tabla(
    ["Indicador", "Churn", "CLV"],
    [
        ["Modelo campeón",         "Logistic Regression",  "XGBoost"],
        ["Métrica principal",       "AUC-ROC: 0.6275",     "R²: 0.93"],
        ["Accuracy",               "58.7%",                "—"],
        ["Recall (clase positiva)", "60.4%",               "—"],
        ["F1-Score",               "0.523",                "—"],
        ["Clientes evaluados",     "300,000",              "300,000"],
        ["Clientes identificados", "112,426 en riesgo",    "4 segmentos clasificados"],
        ["Impacto económico",      "Bs 278.7M en riesgo",  "Bs 803.8M revenue mapeado"],
    ],
    [W*0.40, W*0.30, W*0.30],
    "Tabla 9.5 — Resumen consolidado de métricas y alcance de ambos modelos."
)

story.append(Paragraph(
    "Para el modelo de Churn, el Recall de 60.4% implica que de cada 10 clientes que "
    "efectivamente abandonaron, el modelo identifica correctamente a 6 antes de que se "
    "vayan. Con una base de 112,426 churners, eso se traduce en aproximadamente 67,900 "
    "clientes en riesgo detectables, sobre los cuales la empresa puede ejecutar campañas "
    "de retención dirigidas. Considerando que el costo de retener a un cliente existente "
    "es significativamente menor que el de adquirir uno nuevo, incluso una tasa de "
    "reactivación modesta sobre ese grupo representaría un retorno positivo.", BODY))

story.append(Paragraph(
    "En el caso del CLV, el R² de 0.93 indica que el modelo tiene capacidad predictiva "
    "suficiente para orientar la asignación diferenciada de recursos. Identificar que los "
    "clientes VIP — que representan una fracción pequeña de la base — concentran una "
    "proporción desproporcionada del revenue total es, por sí solo, suficiente para "
    "justificar tratos diferenciados en el programa de lealtad, en la asignación de "
    "descuentos y en la frecuencia de contacto.", BODY))

story.append(Paragraph(
    "Desde el punto de vista de la ingeniería de datos, la materialización de las OBTs "
    "en Snowflake redujo el tiempo de preparación de datos de potencialmente varias horas "
    "de consultas ad hoc a una conexión directa de segundos. Esto hace que el ciclo de "
    "experimentación sea mucho más rápido y que los notebooks sean reutilizables sin "
    "necesidad de reconstruir las consultas base.", BODY))

story += kpi_box([
    ("Clientes detectables en riesgo",  "~67,900",   "#C0392B"),
    ("Revenue mapeado por segmento",    "Bs 803.8M", "#1A6B3A"),
    ("Tiempo de prep. de datos",        "< 30 seg",  "#1E3A5F"),
    ("Modelos versionados en MLflow",   "2 activos", "#2E6DA4"),
])

story.append(Spacer(1, 4))

# ══════════════════════════════════════════════════════════════════════════════
# 5. RESULTADOS PARA EL USUARIO DEL SISTEMA
# ══════════════════════════════════════════════════════════════════════════════
story.append(Paragraph("5. Resultados para el Usuario del Sistema", H1))

story.append(Paragraph(
    "Los modelos entrenados no quedan confinados al entorno de Jupyter. El paso final "
    "del pipeline es su integración en el sistema de Business Intelligence de HGC, donde "
    "cualquier usuario con acceso al dashboard puede consultar los resultados sin necesidad "
    "de conocimiento técnico en machine learning o en SQL.", BODY))

story.append(Paragraph(
    "El sistema expone los resultados a través de dos páginas dedicadas, cada una orientada "
    "a un perfil de usuario distinto:", BODY))

story.append(Paragraph("5.1 Página de Valor del Cliente (CLV)", H2))

story.append(Paragraph(
    "Accesible desde la sección Predicciones del menú lateral, esta vista presenta "
    "la inteligencia de segmentos de forma visual e interactiva. El usuario puede explorar "
    "el CLV promedio y el revenue total desglosado por cinco dimensiones: segmento de cliente, "
    "ciudad, sucursal, nivel de lealtad y rango de edad. Cada dimensión tiene su propio "
    "gráfico de barras con el detalle numérico de cada grupo.", BODY))

story.append(Paragraph(
    "Adicionalmente, la página incluye un predictor individual: el usuario puede ingresar "
    "el perfil de un cliente nuevo — frecuencia estimada, antigüedad, cantidad de artículos — "
    "y obtener de inmediato una estimación de su CLV esperado. Esta funcionalidad permite "
    "al área comercial evaluar el potencial de un cliente antes de asignarle beneficios "
    "del programa de lealtad.", BODY))

bullets_clv_ui = [
    "<b>KPIs globales:</b> total de clientes, revenue total (Bs 803.8M), CLV promedio (Bs 2,679) y pedidos históricos (3,828,721).",
    "<b>Análisis dimensional:</b> gráficos por segmento, ciudad, sucursal, nivel de lealtad y rango de edad.",
    "<b>Predictor individual:</b> estimación de CLV en tiempo real para un perfil de cliente ingresado manualmente.",
]
for b in bullets_clv_ui:
    story.append(Paragraph(f"• {b}", BULLET))

story.append(Paragraph("5.2 Página de Fuga de Clientes (Churn)", H2))

story.append(Paragraph(
    "Esta página cumple una función dual: mostrar el estado actual del riesgo de abandono "
    "en la base de clientes, y permitir evaluar el riesgo individual de un cliente antes "
    "de contactarlo. La sección descriptiva muestra los grupos de riesgo — alto, medio y "
    "bajo — con el número de clientes en cada categoría y el revenue que representan.", BODY))

story.append(Paragraph(
    "La sección predictiva funciona como una herramienta de diagnóstico previo al contacto: "
    "el agente de retención ingresa los datos del cliente (frecuencia histórica, gasto acumulado "
    "y rango de edad) y el sistema devuelve un veredicto — cliente saludable o fuga inminente — "
    "con un indicador visual de nivel de riesgo. El modelo prioriza frecuencia y monto de gasto "
    "como señales, sin depender de recencia, lo que permite evaluar clientes cuyo historial "
    "de inactividad aún no es suficiente para clasificarlos manualmente.", BODY))

bullets_churn_ui = [
    "<b>Panel de riesgo global:</b> grupos alto, medio y bajo con conteo de clientes y revenue en riesgo.",
    "<b>Gráfico por edad:</b> distribución de la tasa de churn por grupo etario del dataset de entrenamiento.",
    "<b>Predictor individual:</b> veredicto de riesgo con gauge visual basado en el modelo campeón.",
    "<b>Ficha técnica del modelo:</b> métricas de validación visibles para el usuario técnico (AUC, Recall, F1).",
]
for b in bullets_churn_ui:
    story.append(Paragraph(f"• {b}", BULLET))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "En conjunto, ambas páginas transforman el output técnico de los modelos en herramientas "
    "operativas concretas. Un gerente puede identificar cuáles sucursales tienen los clientes "
    "de mayor valor, un analista puede detectar a tiempo qué segmento está en mayor riesgo "
    "de abandono, y un agente de retención puede evaluar el riesgo de un cliente específico "
    "antes de diseñar la oferta de reconquista. Eso es, en definitiva, el propósito del "
    "módulo: convertir datos en decisiones.", BODY))

story.append(Spacer(1, 6))
story.append(hr())
story.append(Spacer(1, 6))

story.append(Paragraph(
    "Nota metodológica: todos los resultados presentados en este capítulo fueron obtenidos "
    "ejecutando los notebooks <i>2_clv_segmentation.ipynb</i> y <i>4_churn_prediction.ipynb</i> "
    "sobre datos reales de producción alojados en Snowflake (cuenta IPCSTVD-EO18571, schema "
    "TRAINING_DATASETS). Las métricas reportadas corresponden a la evaluación sobre el "
    "conjunto de prueba (20% del total, holdout estratificado). Los modelos entrenados "
    "fueron registrados bajo el experimento MLflow con ID de tracking local.", NOTA))

# ══════════════════════════════════════════════════════════════════════════════
# CONSTRUIR PDF
# ══════════════════════════════════════════════════════════════════════════════
def on_page(canvas, doc):
    canvas.saveState()
    # Línea superior
    canvas.setStrokeColor(AZUL_HGC)
    canvas.setLineWidth(1.5)
    canvas.line(3*cm, A4[1]-2*cm, A4[0]-2.5*cm, A4[1]-2*cm)
    # Número de página
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.HexColor("#888888"))
    canvas.drawRightString(A4[0]-2.5*cm, 1.5*cm, f"Página {doc.page}")
    # HGC branding
    canvas.drawString(3*cm, 1.5*cm, "HGC — Sistema de Analítica Predictiva | Capítulo IX")
    canvas.restoreState()

doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print(f"[OK] PDF generado: {OUT_PATH}")
