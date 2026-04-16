
  create or replace   view HGC_DW.SILVER.stg_mysql__proveedores
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_MYSQL.proveedores)
select
    id_proveedor as id_proveedor_nk,
    nombre as nombre_proveedor,
    contacto as contacto_principal,
    telefono,
    ciudad_origen,
    estado as estado_proveedor
from source
  );

