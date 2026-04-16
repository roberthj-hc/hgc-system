
  
    

create or replace transient table HGC_DW.GOLD.dim_insumo
    
    
    
    as (
with insumo as (select * from HGC_DW.snapshots.snp_insumo)
select
    md5(cast(coalesce(cast(id_insumo_nk as TEXT), '_dbt_utils_surrogate_key_null_') || '-' || coalesce(cast(dbt_valid_from as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_insumo_sk,
    id_insumo_nk,
    nombre_insumo,
    unidad_medida,
    costo_unitario as costo_unitario_historico,
    activo,
    dbt_valid_from as valido_desde,
    dbt_valid_to as valido_hasta,
    case when dbt_valid_to is null then true else false end as es_actual
from insumo
    )
;


  