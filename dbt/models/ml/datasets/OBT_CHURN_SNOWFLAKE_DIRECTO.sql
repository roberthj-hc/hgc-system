{{ config(enabled=false) }}

-- =============================================================================
-- OBT_CHURN_SNOWFLAKE_DIRECTO.sql
-- SQL puro para ejecutar DIRECTAMENTE en Snowflake (sin DBT).
-- Equivalente a: feat_clientes_comportamiento + int_clientes_enriquecidos
--                + dimensiones geográficas y de lealtad
--                + obt_churn_prediction
--
-- Base de datos: HGC_DW | Schema fuente: GOLD
-- Schema destino: TRAINING_DATASETS
--
-- INSTRUCCIONES PARA MATERIALIZAR:
--   1. Abrir Snowflake Worksheets
--   2. Seleccionar: Database = HGC_DW, Role = ACCOUNTADMIN
--   3. Pegar y ejecutar TODA esta consulta
--   4. La tabla quedará en: HGC_DW.TRAINING_DATASETS.OBT_CHURN_PREDICTION
--
-- DEFINICIÓN DE CHURN:
--   Un cliente se considera "churned" (perdido) si su última compra fue
--   hace más de 90 días (FEATURE_RECENCIA_DIAS >= 90).
--   TARGET_ES_CHURN = 1 → cliente en riesgo/perdido
--   TARGET_ES_CHURN = 0 → cliente activo
-- =============================================================================

CREATE OR REPLACE TABLE HGC_DW.TRAINING_DATASETS.OBT_CHURN_PREDICTION AS (

WITH comportamiento_cliente AS (
    -- ─── Features de comportamiento histórico por cliente ─────────────────────
    -- Fuente: GOLD.FACT_VENTAS_DETALLE
    -- Equivale al modelo DBT: feat_clientes_comportamiento
    SELECT
        f.ID_CLIENTE_SK,
        COUNT(DISTINCT f.NRO_PEDIDO_DD)                                   AS FEATURE_FRECUENCIA_HISTORICA,
        SUM(f.MONTO_SUBTOTAL_NETO)                                         AS FEATURE_MONTO_GASTO_HISTORICO,
        ROUND(AVG(f.PRECIO_UNITARIO_VENTA), 2)                             AS FEATURE_TICKET_PROMEDIO,
        DATEDIFF('day',
            TO_DATE(CAST(MAX(f.ID_FECHA_SK) AS VARCHAR), 'YYYYMMDD'),
            CURRENT_DATE())                                                AS FEATURE_RECENCIA_DIAS,
        DATEDIFF('day',
            TO_DATE(CAST(MIN(f.ID_FECHA_SK) AS VARCHAR), 'YYYYMMDD'),
            TO_DATE(CAST(MAX(f.ID_FECHA_SK) AS VARCHAR), 'YYYYMMDD'))     AS FEATURE_ANTIGUEDAD_DIAS
    FROM HGC_DW.GOLD.FACT_VENTAS_DETALLE f
    GROUP BY f.ID_CLIENTE_SK
),

sucursal_por_cliente AS (
    -- ─── Conteo de pedidos por cliente × sucursal ─────────────────────────────
    SELECT
        f.ID_CLIENTE_SK,
        f.ID_SUCURSAL_SK,
        COUNT(DISTINCT f.NRO_PEDIDO_DD)  AS TOTAL_PEDIDOS_SUCURSAL,
        ROW_NUMBER() OVER (
            PARTITION BY f.ID_CLIENTE_SK
            ORDER BY COUNT(DISTINCT f.NRO_PEDIDO_DD) DESC
        )                                AS RN
    FROM HGC_DW.GOLD.FACT_VENTAS_DETALLE f
    GROUP BY f.ID_CLIENTE_SK, f.ID_SUCURSAL_SK
),

sucursal_primaria AS (
    -- ─── Sucursal donde más compra cada cliente ────────────────────────────────
    -- Fuente: GOLD.DIM_SUCURSAL
    SELECT
        sp.ID_CLIENTE_SK,
        ds.NOMBRE_SUCURSAL,
        ds.CIUDAD,
        ds.TIPO_FORMATO
    FROM sucursal_por_cliente sp
    JOIN HGC_DW.GOLD.DIM_SUCURSAL ds
        ON sp.ID_SUCURSAL_SK = ds.ID_SUCURSAL_SK
       AND ds.ES_ACTUAL      = TRUE
    WHERE sp.RN = 1
),

lealtad_actual AS (
    -- ─── Nivel de lealtad más reciente por cliente ────────────────────────────
    -- Fuente: GOLD.FACT_ESTADO_LEALTAD_MENSUAL
    SELECT
        ID_CLIENTE_SK,
        NIVEL_LEALTAD_DD,
        PUNTOS_ACUMULADOS_HISTORICOS,
        ROW_NUMBER() OVER (
            PARTITION BY ID_CLIENTE_SK
            ORDER BY ID_FECHA_CIERRE_MES_SK DESC
        ) AS RN
    FROM HGC_DW.GOLD.FACT_ESTADO_LEALTAD_MENSUAL
),

nivel_actual AS (
    SELECT ID_CLIENTE_SK, NIVEL_LEALTAD_DD, PUNTOS_ACUMULADOS_HISTORICOS
    FROM lealtad_actual
    WHERE RN = 1
)

-- ── Dataset final (One Big Table para Churn) ──────────────────────────────────
SELECT
    -- Identificador del cliente
    c.ID_CLIENTE_NK,

    -- Dimensiones demográficas (fuente: GOLD.DIM_CLIENTE)
    c.RANGO_EDAD,
    c.SEGMENTO,
    c.GENERO,

    -- Dimensiones geográficas (fuente: GOLD.DIM_SUCURSAL)
    COALESCE(sp.CIUDAD,           'Sin Datos')  AS CIUDAD,
    COALESCE(sp.NOMBRE_SUCURSAL,  'Sin Datos')  AS NOMBRE_SUCURSAL,
    COALESCE(sp.TIPO_FORMATO,     'Sin Datos')  AS TIPO_FORMATO,

    -- Programa de lealtad (fuente: GOLD.FACT_ESTADO_LEALTAD_MENSUAL)
    COALESCE(nl.NIVEL_LEALTAD_DD,             'Sin Nivel') AS NIVEL_LEALTAD_DD,
    COALESCE(nl.PUNTOS_ACUMULADOS_HISTORICOS,  0)          AS PUNTOS_ACUMULADOS_HISTORICOS,

    -- Features de comportamiento para el modelo de clasificación
    COALESCE(cc.FEATURE_FRECUENCIA_HISTORICA,   0)    AS FEATURE_FRECUENCIA_HISTORICA,
    COALESCE(cc.FEATURE_MONTO_GASTO_HISTORICO,  0)    AS FEATURE_MONTO_GASTO_HISTORICO,
    COALESCE(cc.FEATURE_RECENCIA_DIAS,          9999) AS FEATURE_RECENCIA_DIAS,
    COALESCE(cc.FEATURE_TICKET_PROMEDIO,        0)    AS FEATURE_TICKET_PROMEDIO,
    COALESCE(cc.FEATURE_ANTIGUEDAD_DIAS,        0)    AS FEATURE_ANTIGUEDAD_DIAS,

    -- TARGET: clasificación binaria supervisada
    -- 1 = cliente churned (última compra hace más de 90 días)
    -- 0 = cliente activo  (última compra hace 90 días o menos)
    CASE
        WHEN COALESCE(cc.FEATURE_RECENCIA_DIAS, 9999) >= 90 THEN 1
        ELSE 0
    END AS TARGET_ES_CHURN

FROM HGC_DW.GOLD.DIM_CLIENTE c
LEFT JOIN comportamiento_cliente cc  ON c.ID_CLIENTE_SK = cc.ID_CLIENTE_SK
LEFT JOIN sucursal_primaria sp       ON c.ID_CLIENTE_SK = sp.ID_CLIENTE_SK
LEFT JOIN nivel_actual nl            ON c.ID_CLIENTE_SK = nl.ID_CLIENTE_SK
WHERE c.ES_ACTUAL = TRUE

ORDER BY cc.FEATURE_RECENCIA_DIAS DESC NULLS LAST

); -- Fin del CREATE TABLE

-- =============================================================================
-- Verificación post-materialización:
--
-- SELECT COUNT(*) AS total_clientes FROM HGC_DW.TRAINING_DATASETS.OBT_CHURN_PREDICTION;
-- SELECT COUNT(*) AS churned, SUM(TARGET_ES_CHURN) AS total_churn,
--        ROUND(SUM(TARGET_ES_CHURN)*100.0/COUNT(*), 2) AS tasa_churn_pct
-- FROM HGC_DW.TRAINING_DATASETS.OBT_CHURN_PREDICTION;
-- SELECT * FROM HGC_DW.TRAINING_DATASETS.OBT_CHURN_PREDICTION LIMIT 10;
--
-- Columnas resultantes:
--   ID_CLIENTE_NK               NUMBER      Clave natural del cliente
--   RANGO_EDAD                  VARCHAR     Rango etario (Menor de 18, 18-25, 26-35, Mayor de 35)
--   SEGMENTO                    VARCHAR     Nuevo | VIP | Frecuente | Inactivo
--   GENERO                      VARCHAR     Masculino | Femenino | Otro
--   CIUDAD                      VARCHAR     La Paz | El Alto | Cochabamba | Santa Cruz
--   NOMBRE_SUCURSAL             VARCHAR     Sucursal donde más compra el cliente
--   TIPO_FORMATO                VARCHAR     Express | Restaurante | Drive-Thru
--   NIVEL_LEALTAD_DD            VARCHAR     Bronce | Plata | Oro | Sin Nivel
--   PUNTOS_ACUMULADOS_HISTORICOS NUMBER     Puntos del programa de lealtad
--   FEATURE_FRECUENCIA_HISTORICA NUMBER     # de pedidos distintos (lifetime)
--   FEATURE_MONTO_GASTO_HISTORICO FLOAT    Monto total gastado (Bs)
--   FEATURE_RECENCIA_DIAS       NUMBER      Días desde última compra hasta hoy
--   FEATURE_TICKET_PROMEDIO     FLOAT       Precio unitario promedio
--   FEATURE_ANTIGUEDAD_DIAS     NUMBER      Días entre primera y última compra
--   TARGET_ES_CHURN             NUMBER      1 = churned (≥90 días), 0 = activo ← variable objetivo
-- =============================================================================

