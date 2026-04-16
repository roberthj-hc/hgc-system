with source as (select * from HGC_DW.BRONZE_SQLSERVER.turnos)
select
    id_turno as id_turno_nk,
    nombre as nombre_turno,
    cast(hora_inicio as time) as hora_inicio_estandar,
    cast(hora_fin as time) as hora_fin_estandar,
    tipo as tipo_turno
from source