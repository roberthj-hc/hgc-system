{{ config(materialized='table') }}

/*
    DATASET: obt_operational_demand
    ------------------------------
    One Big Table (OBT) para la predicción de demanda operativa diaria.
    Contiene métricas de volumen, características de tiempo y features
    de series temporales (lags/rolling).
    
    Usado por: 5_operational_demand.ipynb
*/

select
    fecha_prediccion,
    id_producto_nk,
    nombre_producto,
    categoria_nombre,
    tipo_producto,

    -- Meta / Target
    cantidad_total_dia as target_cantidad_total,
    num_ordenes_dia as meta_num_ordenes,

    -- Features de Tiempo
    dia_semana as feature_dia_semana,
    es_fin_de_semana as feature_es_fin_de_semana,
    mes as feature_mes,
    nombre_dia as meta_nombre_dia,

    -- Features de Demanda (Lags)
    coalesce(lag_1_dia, 0) as feature_lag_1_dia,
    coalesce(lag_7_dias, 0) as feature_lag_7_dias,

    -- Features de Demanda (Rolling)
    coalesce(rolling_avg_7d, 0) as feature_rolling_avg_7d,
    coalesce(rolling_std_7d, 0) as feature_rolling_std_7d,
    coalesce(rolling_avg_30d, 0) as feature_rolling_avg_30d,
    coalesce(feature_coef_variacion_7d, 0) as feature_coef_variacion_7d

from {{ ref('feat_demanda_operativa') }}
