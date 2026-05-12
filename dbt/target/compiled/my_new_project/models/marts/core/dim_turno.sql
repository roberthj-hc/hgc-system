
with turno as (select * from HGC_DW.SILVER.stg_sqlserver__turnos)
select
    md5(cast(coalesce(cast(id_turno_nk as TEXT), '_dbt_utils_surrogate_key_null_') as TEXT)) as id_turno_sk,
    id_turno_nk,
    nombre_turno,
    hora_inicio_estandar,
    hora_fin_estandar,
    tipo_turno
from turno