
  create or replace   view HGC_DW.SILVER.stg_csv__calendario
  
  
  
  
  as (
    with source as (select * from HGC_DW.BRONZE_CSV_EXCEL.calendario)
select
    id_fecha as id_fecha_nk,
    cast(fecha as date) as fecha,
    dia_semana,
    numero_dia as dia_mes,
    semana as semana_anio,
    mes,
    nombre_mes,
    trimestre,
    anio,
    cast(es_feriado as boolean) as es_feriado,
    cast(es_fin_semana as boolean) as es_fin_semana
from source
  );

