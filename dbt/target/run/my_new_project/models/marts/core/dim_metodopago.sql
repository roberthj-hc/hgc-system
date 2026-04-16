
  
    

create or replace transient table HGC_DW.GOLD.dim_metodopago
    
    
    
    as (
with metodo as (select * from HGC_DW.SILVER.stg_mariadb__metodos_pago)
select
    md5(cast(coalesce(cast(id_metodo_nk as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_metodo_sk,
    id_metodo_nk,
    nombre_metodo,
    -- Categorizamos dinámicamente si es digital o físico para facilitar el análisis
    case 
        when upper(nombre_metodo) in ('EFECTIVO') then 'Físico'
        else 'Digital' 
    end as categoria_metodo
from metodo
    )
;


  