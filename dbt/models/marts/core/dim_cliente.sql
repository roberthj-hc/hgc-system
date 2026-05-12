{{ config(materialized='table') }}
with cliente as (select * from {{ ref('int_clientes_enriquecidos') }})
select
    {{ dbt_utils.generate_surrogate_key(['id_cliente_nk', 'dbt_valid_from']) }} as id_cliente_sk,
    id_cliente_nk,
    nombre_completo,
    celular,
    email,
    genero,
    segmento,
    rango_edad,
    dbt_valid_from as valido_desde,
    dbt_valid_to as valido_hasta,
    case when dbt_valid_to is null then true else false end as es_actual
from cliente