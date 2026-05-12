{{ config(enabled=false) }}

-- =============================================================================
-- OBT_CLV_SNOWFLAKE_DIRECTO.sql
-- SQL puro para ejecutar DIRECTAMENTE en Snowflake (sin DBT).
-- Equivalente a: feat_clientes_comportamiento + int_clv_segmentacion
--                + int_clientes_enriquecidos + obt_customer_lifetime_value
--
-- Base de datos: HGC_DW | Schema fuente: GOLD
-- Schema destino: TRAINING_DATASETS
--
-- INSTRUCCIONES PARA MATERIALIZAR:
--   1. Abrir Snowflake Worksheets
--   2. Seleccionar: Database = HGC_DW, Role = ACCOUNTADMIN
--   3. Pegar y ejecutar TODA esta consulta
--   4. La tabla quedará en: HGC_DW.TRAINING_DATASETS.OBT_CUSTOMER_LIFETIME_VALUE
-- =============================================================================

CREATE OR REPLACE TABLE HGC_DW.TRAINING_DATASETS.OBT_CUSTOMER_LIFETIME_VALUE AS (

WITH comportamiento_cliente AS (
    -- ─── Features de comportamiento histórico por cliente ─────────────────────
    -- Fuente: GOLD.FACT_VENTAS_DETALLE
    -- Equivale al modelo DBT: feat_clientes_comportamiento
    SELECT
        f.ID_CLIENTE_SK,
        COUNT(DISTINCT f.NRO_PEDIDO_DD)                                  AS FEATURE_FREQ_TOTAL,
        SUM(f.CANTIDAD_VENDIDA)                                           AS FEATURE_CANTIDAD_ARTICULOS,
        SUM(f.MONTO_SUBTOTAL_NETO)                                        AS TARGET_CLV_HISTORICO,
        ROUND(AVG(f.PRECIO_UNITARIO_VENTA), 2)                            AS FEATURE_TICKET_PROMEDIO,
        DATEDIFF('day',
            TO_DATE(CAST(MIN(f.ID_FECHA_SK) AS VARCHAR), 'YYYYMMDD'),
            TO_DATE(CAST(MAX(f.ID_FECHA_SK) AS VARCHAR), 'YYYYMMDD'))    AS FEATURE_ANTIGUEDAD_DIAS,
        DATEDIFF('day',
            TO_DATE(CAST(MAX(f.ID_FECHA_SK) AS VARCHAR), 'YYYYMMDD'),
            CURRENT_DATE())                                               AS FEATURE_RECENCIA_DIAS
    FROM HGC_DW.GOLD.FACT_VENTAS_DETALLE f
    GROUP BY f.ID_CLIENTE_SK
),

sucursal_por_cliente AS (
    -- ─── Conteo de pedidos por cliente × sucursal ─────────────────────────────
    -- Para determinar la sucursal "primaria" (donde más compra cada cliente)
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
    -- Equivale al modelo DBT: int_clv_segmentacion (parte geográfica)
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
    -- Equivale al modelo DBT: int_clv_segmentacion (parte de lealtad)
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

-- ── Dataset final (One Big Table para CLV) ────────────────────────────────────
SELECT
    -- Identificador del cliente
    c.ID_CLIENTE_SK,

    -- Dimensiones demográficas (fuente: GOLD.DIM_CLIENTE)
    c.ID_CLIENTE_NK,
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

    -- Features de comportamiento para el modelo de regresión
    COALESCE(cc.FEATURE_FREQ_TOTAL,          0)    AS FEATURE_FREQ_TOTAL,
    COALESCE(cc.FEATURE_CANTIDAD_ARTICULOS,  0)    AS FEATURE_CANTIDAD_ARTICULOS,
    COALESCE(cc.FEATURE_ANTIGUEDAD_DIAS,     0)    AS FEATURE_ANTIGUEDAD_DIAS,
    COALESCE(cc.FEATURE_TICKET_PROMEDIO,     0)    AS FEATURE_TICKET_PROMEDIO,
    COALESCE(cc.FEATURE_RECENCIA_DIAS,       9999) AS FEATURE_RECENCIA_DIAS,

    -- TARGET: valor monetario total del cliente (regresión supervisada)
    COALESCE(cc.TARGET_CLV_HISTORICO, 0)           AS TARGET_CLV_HISTORICO

FROM HGC_DW.GOLD.DIM_CLIENTE c
LEFT JOIN comportamiento_cliente cc  ON c.ID_CLIENTE_SK = cc.ID_CLIENTE_SK
LEFT JOIN sucursal_primaria sp       ON c.ID_CLIENTE_SK = sp.ID_CLIENTE_SK
LEFT JOIN nivel_actual nl            ON c.ID_CLIENTE_SK = nl.ID_CLIENTE_SK
WHERE c.ES_ACTUAL = TRUE

ORDER BY cc.TARGET_CLV_HISTORICO DESC NULLS LAST

); -- Fin del CREATE TABLE

-- =============================================================================
-- Verificación post-materialización:
--
-- SELECT COUNT(*) AS total_clientes FROM HGC_DW.TRAINING_DATASETS.OBT_CUSTOMER_LIFETIME_VALUE;
-- SELECT * FROM HGC_DW.TRAINING_DATASETS.OBT_CUSTOMER_LIFETIME_VALUE LIMIT 10;
--
-- Columnas resultantes:
--   ID_CLIENTE_SK               NUMBER      Llave surrogada del cliente
--   ID_CLIENTE_NK               NUMBER      Clave natural del cliente
--   RANGO_EDAD                  VARCHAR     Rango etario (Menor de 18, 18-25, 26-35, Mayor de 35)
--   SEGMENTO                    VARCHAR     Nuevo | VIP | Frecuente | Inactivo
--   GENERO                      VARCHAR     Masculino | Femenino | Otro
--   CIUDAD                      VARCHAR     La Paz | El Alto | Cochabamba | Santa Cruz
--   NOMBRE_SUCURSAL             VARCHAR     Sucursal donde más compra el cliente
--   TIPO_FORMATO                VARCHAR     Express | Restaurante | Drive-Thru
--   NIVEL_LEALTAD_DD            VARCHAR     Bronce | Plata | Oro | Sin Nivel
--   PUNTOS_ACUMULADOS_HISTORICOS NUMBER     Puntos del programa de lealtad
--   FEATURE_FREQ_TOTAL          NUMBER      # de pedidos distintos (lifetime)
--   FEATURE_CANTIDAD_ARTICULOS  NUMBER      # total de artículos comprados
--   FEATURE_ANTIGUEDAD_DIAS     NUMBER      Días entre primera y última compra
--   FEATURE_TICKET_PROMEDIO     FLOAT       Precio unitario promedio
--   FEATURE_RECENCIA_DIAS       NUMBER      Días desde última compra hasta hoy
--   TARGET_CLV_HISTORICO        FLOAT       Ingreso neto total del cliente (Bs) ← variable objetivo
-- =============================================================================

