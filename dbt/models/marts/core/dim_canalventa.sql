{{ config(materialized='table') }}
with canal as (select * from {{ ref('stg_postgres__canales_venta') }})
select
    {{ dbt_utils.generate_surrogate_key(['id_canal_nk']) }} as id_canal_sk,
    id_canal_nk,
    nombre_canal
from canal