{{ config(materialized='table') }}
with tipo as (select distinct tipo_movimiento from {{ ref('stg_mysql__movimientos_inventario') }})
select
    {{ dbt_utils.generate_surrogate_key(['tipo_movimiento']) }} as id_tipo_mov_sk,
    -- Generamos un código corto en base a la primera letra (E, S, A)
    left(tipo_movimiento, 1) as codigo_tipo_mov_nk,
    tipo_movimiento as descripcion_movimiento
from tipo