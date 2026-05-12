
  create or replace   view HGC_DW.SILVER.stg_sqlserver__cargos
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_SQLSERVER.cargos)
select
    id_cargo as id_cargo_nk,
    nombre as titulo_cargo,
    id_departamento as id_departamento_nk
from source
  );

