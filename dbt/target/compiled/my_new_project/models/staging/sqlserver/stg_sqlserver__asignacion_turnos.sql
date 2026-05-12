with source as (select * from HGC_DW.BRONZE_SQLSERVER.asignacion_turnos)
select
    id_asignacion as id_asignacion_nk,
    id_empleado as id_empleado_nk,
    id_turno as id_turno_nk,
    id_fecha as id_fecha_nk,
    estado as estado_asignacion
from source