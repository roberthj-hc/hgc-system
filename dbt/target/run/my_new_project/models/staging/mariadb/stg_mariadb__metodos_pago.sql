
  create or replace   view HGC_DW.SILVER.stg_mariadb__metodos_pago
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_MARIADB.metodos_pago)
select
    id_metodo as id_metodo_nk,
    nombre as nombre_metodo
from source
  );

