
  create or replace   view HGC_DW.SILVER.stg_postgres__pedido_cupon
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_POSTGRESQL.pedido_cupon)
select
    id as id_pedido_cupon_nk,
    id_pedido as id_pedido_nk,
    id_cupon as id_cupon_nk,
    cast(monto_descuento as numeric(10,2)) as monto_descuento
from source
  );

