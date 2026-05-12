{{ config(materialized='table') }}
with producto as (select * from {{ ref('int_productos_enriquecidos') }})
select
    {{ dbt_utils.generate_surrogate_key(['id_producto_nk', 'dbt_valid_from']) }} as id_producto_sk,
    id_producto_nk,
    nombre_producto,
    categoria_nombre,
    tipo_producto,
    precio_base as precio_base_historico,
    costo_estandar as costo_estandar_historico,
    activo,
    dbt_valid_from as valido_desde,
    dbt_valid_to as valido_hasta,
    case when dbt_valid_to is null then true else false end as es_actual
from producto