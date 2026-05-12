{{
    config(
        materialized='table',
        schema='FEATURES'
    )
}}

WITH diario AS (
    SELECT * FROM {{ ref('int_ventas_diarias_sucursal') }}
),

campanas AS (
    SELECT
        ID_CAMPANA_NK,
        NOMBRE AS nombre_campana,
        CANAL AS canal_campana,
        PRESUPUESTO,
        MES_INICIO,
        DIA_INICIO,
        MES_FIN,
        DIA_FIN
    FROM {{ source('silver', 'STG_MONGODB__CAMPANAS') }}
),

diario_enriquecido AS (
    SELECT
        d.*,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM campanas ca
                WHERE (d.mes > ca.MES_INICIO OR (d.mes = ca.MES_INICIO AND d.dia_mes >= ca.DIA_INICIO))
                  AND (d.mes < ca.MES_FIN OR (d.mes = ca.MES_FIN AND d.dia_mes <= ca.DIA_FIN))
            ) THEN TRUE
            ELSE FALSE
        END AS durante_campana
    FROM diario d
),

metricas_canal AS (
    SELECT
        fecha,
        id_sucursal,
        sucursal,
        ciudad,
        canal_venta,
        dia_semana,
        mes,
        anio,
        trimestre,
        es_feriado,
        es_fin_semana,
        durante_campana,
        num_pedidos,
        ingresos_netos,
        ticket_promedio,
        total_unidades_vendidas,
        AVG(num_pedidos) OVER (
            PARTITION BY id_sucursal, canal_venta
            ORDER BY fecha
            ROWS BETWEEN 27 PRECEDING AND CURRENT ROW
        ) AS media_movil_28d,
        STDDEV(num_pedidos) OVER (
            PARTITION BY id_sucursal, canal_venta
            ORDER BY fecha
            ROWS BETWEEN 27 PRECEDING AND CURRENT ROW
        ) AS stddev_movil_28d
    FROM diario_enriquecido
)

SELECT
    *,
    CASE
        WHEN num_pedidos > media_movil_28d + 2 * NULLIF(stddev_movil_28d, 0) THEN 'PICO_ANOMALO'
        WHEN num_pedidos < media_movil_28d - 2 * NULLIF(stddev_movil_28d, 0) THEN 'CAIDA_ANOMALA'
        ELSE 'NORMAL'
    END AS tipo_anomalia,
    num_pedidos - media_movil_28d AS desviacion_vs_media,
    ROUND((num_pedidos - media_movil_28d) * 100.0
        / NULLIF(media_movil_28d, 0), 2) AS desviacion_pct
FROM metricas_canal