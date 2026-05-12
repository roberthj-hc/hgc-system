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
        MES_INICIO, DIA_INICIO, MES_FIN, DIA_FIN, NOMBRE AS nombre_campana
    FROM {{ source('silver', 'STG_MONGODB__CAMPANAS') }}
),

costos AS (
    SELECT
        ID_SUCURSAL,
        DATE_TRUNC('MONTH', FECHA_PAGO)::DATE AS mes_costo,
        SUM(MONTO) AS costo_operativo_mensual
    FROM {{ source('silver', 'STG_MARIADB__COSTOS_OPERATIVOS') }}
    GROUP BY ID_SUCURSAL, DATE_TRUNC('MONTH', FECHA_PAGO)::DATE
),

serie_diaria AS (
    SELECT
        fecha,
        id_sucursal,
        sucursal,
        ciudad,
        tipo_formato,
        SUM(num_pedidos) AS pedidos_dia,
        SUM(ingresos_netos) AS ingresos_dia,
        AVG(ticket_promedio) AS ticket_promedio_dia,
        SUM(total_unidades_vendidas) AS unidades_dia,
        MAX(es_feriado) AS es_feriado,
        MAX(es_fin_semana) AS es_fin_semana,
        MAX(dia_semana) AS dia_semana,
        MAX(mes) AS mes,
        MAX(anio) AS anio,
        MAX(trimestre) AS trimestre,
        MAX(semana_anio) AS semana_anio
    FROM diario
    GROUP BY fecha, id_sucursal, sucursal, ciudad, tipo_formato
),

con_features AS (
    SELECT
        s.*,
        CASE
            WHEN EXISTS (
                SELECT 1 FROM campanas ca
                WHERE (s.mes > ca.MES_INICIO OR (s.mes = ca.MES_INICIO AND DAY(s.fecha) >= ca.DIA_INICIO))
                  AND (s.mes < ca.MES_FIN OR (s.mes = ca.MES_FIN AND DAY(s.fecha) <= ca.DIA_FIN))
            ) THEN 1
            ELSE 0
        END AS flag_campana_activa,

        LAG(s.pedidos_dia, 1) OVER (PARTITION BY s.id_sucursal ORDER BY s.fecha) AS pedidos_lag_1d,
        LAG(s.pedidos_dia, 7) OVER (PARTITION BY s.id_sucursal ORDER BY s.fecha) AS pedidos_lag_7d,
        LAG(s.pedidos_dia, 14) OVER (PARTITION BY s.id_sucursal ORDER BY s.fecha) AS pedidos_lag_14d,
        LAG(s.pedidos_dia, 28) OVER (PARTITION BY s.id_sucursal ORDER BY s.fecha) AS pedidos_lag_28d,
        LAG(s.pedidos_dia, 364) OVER (PARTITION BY s.id_sucursal ORDER BY s.fecha) AS pedidos_lag_364d,

        AVG(s.pedidos_dia) OVER (
            PARTITION BY s.id_sucursal ORDER BY s.fecha ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) AS media_movil_7d,
        AVG(s.pedidos_dia) OVER (
            PARTITION BY s.id_sucursal ORDER BY s.fecha ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
        ) AS media_movil_14d,
        AVG(s.pedidos_dia) OVER (
            PARTITION BY s.id_sucursal ORDER BY s.fecha ROWS BETWEEN 27 PRECEDING AND CURRENT ROW
        ) AS media_movil_28d,

        STDDEV(s.pedidos_dia) OVER (
            PARTITION BY s.id_sucursal ORDER BY s.fecha ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) AS stddev_7d,

        LAG(s.ingresos_dia, 1) OVER (PARTITION BY s.id_sucursal ORDER BY s.fecha) AS ingresos_lag_1d,
        LAG(s.ingresos_dia, 7) OVER (PARTITION BY s.id_sucursal ORDER BY s.fecha) AS ingresos_lag_7d,

        AVG(s.ingresos_dia) OVER (
            PARTITION BY s.id_sucursal ORDER BY s.fecha ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) AS ingresos_media_movil_7d,

        c.costo_operativo_mensual
    FROM serie_diaria s
    LEFT JOIN costos c
        ON s.id_sucursal = c.ID_SUCURSAL
        AND DATE_TRUNC('MONTH', s.fecha)::DATE = c.mes_costo
)

SELECT
    fecha,
    id_sucursal,
    sucursal,
    ciudad,
    tipo_formato,
    dia_semana,
    mes,
    anio,
    trimestre,
    semana_anio,
    es_feriado,
    es_fin_semana,
    flag_campana_activa,
    pedidos_dia AS target_pedidos,
    ingresos_dia AS target_ingresos,
    ticket_promedio_dia,
    unidades_dia,
    pedidos_lag_1d,
    pedidos_lag_7d,
    pedidos_lag_14d,
    pedidos_lag_28d,
    pedidos_lag_364d,
    media_movil_7d,
    media_movil_14d,
    media_movil_28d,
    stddev_7d,
    ingresos_lag_1d,
    ingresos_lag_7d,
    ingresos_media_movil_7d,
    costo_operativo_mensual,
    ROW_NUMBER() OVER (PARTITION BY id_sucursal ORDER BY fecha) AS dia_secuencial
FROM con_features
WHERE fecha >= '2016-01-01'
ORDER BY id_sucursal, fecha