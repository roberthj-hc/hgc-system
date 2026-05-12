
  create or replace   view HGC_DW.SILVER.stg_postgres__plataformas_delivery
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_POSTGRESQL.plataformas_delivery)
select
    id_plataforma as id_plataforma_nk,
    nombre as nombre_plataforma
from source
  );

