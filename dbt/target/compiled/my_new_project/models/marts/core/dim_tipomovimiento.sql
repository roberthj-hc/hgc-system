
with tipo as (select distinct tipo_movimiento from HGC_DW.SILVER.stg_mysql__movimientos_inventario)
select
    md5(cast(coalesce(cast(tipo_movimiento as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_tipo_mov_sk,
    -- Generamos un código corto en base a la primera letra (E, S, A)
    left(tipo_movimiento, 1) as codigo_tipo_mov_nk,
    tipo_movimiento as descripcion_movimiento
from tipo