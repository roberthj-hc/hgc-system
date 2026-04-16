
  create or replace   view HGC_DW.SILVER.stg_mariadb__facturas
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_MARIADB.facturas)
select
    id_factura as id_factura_nk,
    id_pedido as id_pedido_nk,
    nit_cliente,
    razon_social,
    cast(fecha_emision as timestamp) as fecha_emision,
    nro_autorizacion,
    codigo_control,
    cast(monto_total as numeric(10,2)) as monto_total_facturado
from source
  );

