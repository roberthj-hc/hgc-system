
  
    

create or replace transient table HGC_DW.GOLD.dim_cliente
    
    
    
    as (
with cliente as (select * from HGC_DW.SILVER.int_clientes_enriquecidos)
select
    md5(cast(coalesce(cast(id_cliente_nk as TEXT), '_dbt_utils_surrogate_key_null_') || '-' || coalesce(cast(dbt_valid_from as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_cliente_sk,
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
    )
;


  