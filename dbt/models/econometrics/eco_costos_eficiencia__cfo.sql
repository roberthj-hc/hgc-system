{{ config(
    materialized='table',
    schema='ECONOMETRICS'
) }}

WITH base AS (
    SELECT * FROM {{ ref('int_costos_ingresos_mes') }}
)

SELECT
    b.MES_FECHA,
    EXTRACT(YEAR  FROM b.MES_FECHA)                      AS ANIO,
    EXTRACT(MONTH FROM b.MES_FECHA)                      AS MES,
    EXTRACT(QUARTER FROM b.MES_FECHA)                    AS TRIMESTRE,
    b.ID_SUCURSAL,
    suc.NOMBRE                                           AS SUCURSAL,
    suc.CIUDAD,
    suc.TIPO_FORMATO,

    -- Métricas operativas
    b.N_PEDIDOS,
    b.INGRESOS_NETOS,
    b.UNIDADES_VENDIDAS,
    b.SKU_ACTIVOS,
    b.TICKET_PROMEDIO,
    b.COSTO_OP_TOTAL,
    b.COSTO_FIJO,
    b.COSTO_VARIABLE,

    -- Ratios CFO
    b.COSTO_OP_TOTAL / NULLIF(b.INGRESOS_NETOS, 0)       AS RATIO_COSTO_INGRESO,
    (b.INGRESOS_NETOS - b.COSTO_OP_TOTAL)                AS UTILIDAD_OPERATIVA,
    (b.INGRESOS_NETOS - b.COSTO_OP_TOTAL)
        / NULLIF(b.INGRESOS_NETOS, 0)                    AS MARGEN_OPERATIVO,
    b.COSTO_VARIABLE / NULLIF(b.INGRESOS_NETOS, 0)       AS COSTO_VAR_UNITARIO,

    -- Variables del modelo Cobb-Douglas (log-log)
    LN(NULLIF(b.COSTO_OP_TOTAL, 0))                      AS LN_COSTO,
    LN(NULLIF(b.INGRESOS_NETOS, 0))                      AS LN_INGRESOS,
    LN(NULLIF(b.N_PEDIDOS, 0))                           AS LN_PEDIDOS,
    LN(NULLIF(b.UNIDADES_VENDIDAS, 0))                   AS LN_UNIDADES,

    -- Dummies estructurales
    CASE WHEN suc.TIPO_FORMATO = 'Premium' THEN 1 ELSE 0 END  AS DUMMY_PREMIUM,
    CASE WHEN suc.CIUDAD ILIKE '%La Paz%'
          OR suc.CIUDAD ILIKE '%El Alto%' THEN 1 ELSE 0 END   AS DUMMY_LP_EA,
    CASE WHEN suc.CIUDAD ILIKE '%Santa Cruz%' THEN 1 ELSE 0 END AS DUMMY_SCZ,
    CASE WHEN suc.CIUDAD ILIKE '%Cochabamba%' THEN 1 ELSE 0 END AS DUMMY_CBBA

FROM base b
LEFT JOIN {{ ref('stg_csv__sucursales') }} suc
       ON suc.ID_SUCURSAL_NK = b.ID_SUCURSAL
WHERE b.INGRESOS_NETOS > 0
  AND b.COSTO_OP_TOTAL > 0