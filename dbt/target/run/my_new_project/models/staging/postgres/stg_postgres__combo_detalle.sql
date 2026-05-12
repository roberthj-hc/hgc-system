
  create or replace   view HGC_DW.SILVER.stg_postgres__combo_detalle
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_POSTGRESQL.combo_detalle)
select
    id_combo_detalle as id_combo_detalle_nk,
    id_producto_combo as id_producto_combo_nk,
    id_producto_item as id_producto_item_nk,
    cast(cantidad as integer) as cantidad
from source
  );

