{{ config(materialized='table') }}
with insumo as (select * from {{ ref('snp_insumo') }})
select
    {{ dbt_utils.generate_surrogate_key(['id_insumo_nk', 'dbt_valid_from']) }} as id_insumo_sk,
    id_insumo_nk,
    nombre_insumo,
    unidad_medida,
    costo_unitario as costo_unitario_historico,
    activo,
    dbt_valid_from as valido_desde,
    dbt_valid_to as valido_hasta,
    case when dbt_valid_to is null then true else false end as es_actual
from insumo