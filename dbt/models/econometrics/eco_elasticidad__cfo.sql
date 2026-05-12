{{ config(
    materialized='table',
    schema='ECONOMETRICS'
) }}

WITH ventas AS (
    SELECT * FROM {{ ref('int_ventas_producto_semana') }}
),

calendario_sem AS (
    SELECT
        DATE_TRUNC('WEEK', FECHA)                        AS SEMANA,
        MAX(CASE WHEN ES_FERIADO    THEN 1 ELSE 0 END)   AS HAY_FERIADO,
        SUM(CASE WHEN ES_FIN_SEMANA THEN 1 ELSE 0 END)   AS DIAS_FINDE
    FROM {{ ref('stg_csv__calendario') }}
    GROUP BY 1
)

SELECT
    v.SEMANA,
    v.ID_SUCURSAL,
    suc.NOMBRE                                           AS SUCURSAL,
    suc.CIUDAD,
    suc.TIPO_FORMATO,
    v.ID_PRODUCTO,
    pr.NOMBRE                                            AS PRODUCTO,
    pr.TIPO                                              AS CATEGORIA_PRODUCTO,
    pr.COSTO_ESTANDAR,
    v.UNIDADES,
    v.INGRESOS,
    v.PRECIO_PROM,
    v.DESCUENTO_PROM,
    v.DIAS_ACTIVOS,

    -- Variables del modelo log-log
    LN(NULLIF(v.UNIDADES, 0))                            AS LN_Q,
    LN(NULLIF(v.PRECIO_PROM, 0))                         AS LN_P,
    LN(v.DESCUENTO_PROM + 1)                             AS LN_DESC,

    -- Dummies temporales
    EXTRACT(MONTH FROM v.SEMANA)                         AS MES,
    EXTRACT(YEAR  FROM v.SEMANA)                         AS ANIO,
    EXTRACT(QUARTER FROM v.SEMANA)                       AS TRIMESTRE,
    COALESCE(c.HAY_FERIADO, 0)                           AS DUMMY_FERIADO,
    COALESCE(c.DIAS_FINDE, 0)                            AS DIAS_FINDE,

    -- Dummies espaciales
    CASE WHEN suc.TIPO_FORMATO = 'Premium' THEN 1 ELSE 0 END  AS DUMMY_PREMIUM,
    CASE WHEN suc.CIUDAD ILIKE '%La Paz%'
          OR suc.CIUDAD ILIKE '%El Alto%' THEN 1 ELSE 0 END   AS DUMMY_LP_EA,
    CASE WHEN suc.CIUDAD ILIKE '%Santa Cruz%' THEN 1 ELSE 0 END AS DUMMY_SCZ,
    CASE WHEN suc.CIUDAD ILIKE '%Cochabamba%' THEN 1 ELSE 0 END AS DUMMY_CBBA,

    -- Margen unitario para simulador what-if
    v.PRECIO_PROM - pr.COSTO_ESTANDAR                    AS MARGEN_UNITARIO,
    (v.PRECIO_PROM - pr.COSTO_ESTANDAR)
        / NULLIF(v.PRECIO_PROM, 0)                       AS MARGEN_PCT

FROM ventas v
LEFT JOIN {{ ref('stg_postgresql__productos') }} pr
       ON pr.ID_PRODUCTO_NK = v.ID_PRODUCTO
LEFT JOIN {{ ref('stg_csv__sucursales') }} suc
       ON suc.ID_SUCURSAL_NK = v.ID_SUCURSAL
LEFT JOIN calendario_sem c
       ON c.SEMANA = v.SEMANA
WHERE v.UNIDADES > 0
  AND v.PRECIO_PROM > 0