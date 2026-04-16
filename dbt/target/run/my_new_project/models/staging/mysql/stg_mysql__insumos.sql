
  create or replace   view HGC_DW.SILVER.stg_mysql__insumos
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_MYSQL.insumos)
select
    id_insumo as id_insumo_nk,
    nombre as nombre_insumo,
    unidad_medida,
    cast(costo_unitario as numeric(10,2)) as costo_unitario,
    cast(activo as boolean) as activo,
    cast(fecha_creacion as timestamp) as fecha_creacion
from source
  );

