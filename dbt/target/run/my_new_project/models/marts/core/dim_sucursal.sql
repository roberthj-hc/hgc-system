
  
    

create or replace transient table HGC_DW.GOLD.dim_sucursal
    
    
    
    as (
with sucursal as (select * from HGC_DW.snapshots.snp_sucursal)
select
    md5(cast(coalesce(cast(id_sucursal_nk as TEXT), '_dbt_utils_surrogate_key_null_') || '-' || coalesce(cast(dbt_valid_from as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_sucursal_sk,
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
    )
;


  