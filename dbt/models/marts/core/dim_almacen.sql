{{ config(materialized='table') }}
with almacen as (select * from {{ ref('int_almacenes_enriquecidos') }})
select
    {{ dbt_utils.generate_surrogate_key(['id_almacen_nk']) }} as id_almacen_sk,
    id_almacen_nk,
    nombre_almacen,
    tipo_almacen,
    nombre_sucursal_asociada
from almacen