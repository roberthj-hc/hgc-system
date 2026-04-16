{{ config(materialized='table') }}
with metodo as (select * from {{ ref('stg_mariadb__metodos_pago') }})
select
    {{ dbt_utils.generate_surrogate_key(['id_metodo_nk']) }} as id_metodo_sk,
    id_metodo_nk,
    nombre_metodo,
    -- Categorizamos dinámicamente si es digital o físico para facilitar el análisis
    case 
        when upper(nombre_metodo) in ('EFECTIVO') then 'Físico'
        else 'Digital' 
    end as categoria_metodo
from metodo