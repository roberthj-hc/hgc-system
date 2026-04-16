{{ config(materialized='table') }}
with calendario as (select * from {{ ref('stg_csv__calendario') }})
select
    -- Formato YYYYMMDD como entero para particionamiento eficiente
    cast(to_char(fecha, 'YYYYMMDD') as integer) as id_fecha_sk,
    fecha,
    dia_semana,
    -- Snowflake: extrae el número del día (1=Lunes, 7=Domingo)
    dayofweekiso(fecha) as numero_dia_semana,
    dia_mes,
    dayofyear(fecha) as dia_anio,
    semana_anio,
    mes,
    nombre_mes,
    trimestre,
    anio,
    es_feriado,
    es_fin_semana
from calendario