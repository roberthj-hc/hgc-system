
  create or replace   view HGC_DW.SILVER.stg_mongodb__campanas
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_MONGODB.campanas)
select
    id_campana as id_campana_nk,
    nombre as nombre_campana,
    cast(fecha_inicio as date) as fecha_inicio_campana,
    cast(fecha_fin as date) as fecha_fin_campana,
    cast(presupuesto as numeric(10,2)) as presupuesto_campana,
    canal as canal_campana
from source
  );

