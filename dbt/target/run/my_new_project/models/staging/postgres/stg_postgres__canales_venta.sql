
  create or replace   view HGC_DW.SILVER.stg_postgres__canales_venta
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_POSTGRESQL.canales_venta)
select
    id_canal as id_canal_nk,
    nombre as nombre_canal
from source
  );

