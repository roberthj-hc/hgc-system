
  create or replace   view HGC_DW.SILVER.stg_mysql__almacenes
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_MYSQL.almacenes)
select
    id_almacen as id_almacen_nk,
    id_sucursal as id_sucursal_nk,
    nombre as nombre_almacen,
    tipo as tipo_almacen
from source
  );

