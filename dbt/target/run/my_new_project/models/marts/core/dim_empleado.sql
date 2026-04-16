
  
    

create or replace transient table HGC_DW.GOLD.dim_empleado
    
    
    
    as (
with empleado as (select * from HGC_DW.SILVER.int_empleados_enriquecidos)
select
    md5(cast(coalesce(cast(id_empleado_nk as TEXT), '_dbt_utils_surrogate_key_null_') || '-' || coalesce(cast(dbt_valid_from as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_empleado_sk,
    id_empleado_nk,
    nombre_completo,
    documento_identidad,
    fecha_ingreso,
    salario_base,
    tipo_contrato,
    estado_empleado,
    cargo_titulo,
    departamento_nombre,
    dbt_valid_from as valido_desde,
    dbt_valid_to as valido_hasta,
    case when dbt_valid_to is null then true else false end as es_actual
from empleado
    )
;


  