
  create or replace   view HGC_DW.SILVER.stg_postgres__productos
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_POSTGRESQL.productos)
select
    id_producto as id_producto_nk,
    id_categoria as id_categoria_nk,
    nombre as nombre_producto,
    tipo as tipo_producto,
    cast(precio_base as numeric(10,2)) as precio_base,
    cast(costo_estandar as numeric(10,2)) as costo_estandar,
    cast(activo as boolean) as activo,
    cast(fecha_creacion as timestamp) as fecha_creacion
from source
  );

