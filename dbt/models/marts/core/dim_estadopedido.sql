{{ config(materialized='table') }}
with estado as (select * from {{ ref('stg_postgres__estados_pedido') }})
select
    {{ dbt_utils.generate_surrogate_key(['id_estado_nk']) }} as id_estado_sk,
    id_estado_nk,
    nombre_estado
from estado