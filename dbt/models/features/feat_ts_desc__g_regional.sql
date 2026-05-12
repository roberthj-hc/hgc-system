{{
    config(
        materialized='table',
        schema='FEATURES'
    )
}}

WITH diario AS (
    SELECT * FROM {{ ref('int_ventas_diarias_sucursal') }}
),

semanal_sucursal AS (
    SELECT
        anio,
        semana_anio,
        MIN(fecha) AS fecha_inicio_semana,
        id_sucursal,
        sucursal,
        ciudad,
        tipo_formato,
        SUM(num_pedidos) AS pedidos_semana,
        SUM(ingresos_netos) AS ingresos_semana,
        SUM(total_descuentos) AS descuentos_semana,
        AVG(ticket_promedio) AS ticket_promedio_semana,
        SUM(total_unidades_vendidas) AS unidades_semana,
        SUM(CASE WHEN es_feriado = TRUE THEN num_pedidos ELSE 0 END) AS pedidos_en_feriado,
        SUM(CASE WHEN es_fin_semana = TRUE THEN num_pedidos ELSE 0 END) AS pedidos_fin_semana,
        SUM(CASE WHEN es_fin_semana = FALSE AND es_feriado = FALSE THEN num_pedidos ELSE 0 END) AS pedidos_dias_laborales,
        COUNT(DISTINCT fecha) AS dias_operacion
    FROM diario
    GROUP BY anio, semana_anio, id_sucursal, sucursal, ciudad, tipo_formato
),

con_metricas AS (
    SELECT
        *,
        pedidos_semana / NULLIF(dias_operacion, 0) AS pedidos_promedio_diario,
        ingresos_semana / NULLIF(dias_operacion, 0) AS ingreso_promedio_diario,
        LAG(pedidos_semana, 1) OVER (
            PARTITION BY id_sucursal ORDER BY anio, semana_anio
        ) AS pedidos_semana_anterior,
        LAG(ingresos_semana, 1) OVER (
            PARTITION BY id_sucursal ORDER BY anio, semana_anio
        ) AS ingresos_semana_anterior,
        LAG(pedidos_semana, 52) OVER (
            PARTITION BY id_sucursal ORDER BY anio, semana_anio
        ) AS pedidos_misma_semana_anio_anterior
    FROM semanal_sucursal
)

SELECT
    *,
    ROUND((pedidos_semana - pedidos_semana_anterior) * 100.0
        / NULLIF(pedidos_semana_anterior, 0), 2) AS variacion_wow_pct,
    ROUND((pedidos_semana - pedidos_misma_semana_anio_anterior) * 100.0
        / NULLIF(pedidos_misma_semana_anio_anterior, 0), 2) AS variacion_yoy_pct
FROM con_metricas