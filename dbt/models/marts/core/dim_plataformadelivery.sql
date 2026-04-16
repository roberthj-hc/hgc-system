{{ config(materialized='table') }}
with plataforma as (select * from {{ ref('stg_postgres__plataformas_delivery') }})
select
    {{ dbt_utils.generate_surrogate_key(['id_plataforma_nk']) }} as id_plataforma_sk,
    id_plataforma_nk,
    nombre_plataforma
from plataforma