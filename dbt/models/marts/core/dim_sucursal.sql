{{ config(materialized='table') }}
with sucursal as (select * from {{ ref('snp_sucursal') }})
select
    {{ dbt_utils.generate_surrogate_key(['id_sucursal_nk', 'dbt_valid_from']) }} as id_sucursal_sk,
    id_sucursal_nk,
    nombre_sucursal,
    ciudad,
    direccion,
    tipo_formato,
    fecha_apertura,
    estado_sucursal,
    nombre_gerente,
    dbt_valid_from as valido_desde,
    dbt_valid_to as valido_hasta,
    case when dbt_valid_to is null then true else false end as es_actual
from sucursal