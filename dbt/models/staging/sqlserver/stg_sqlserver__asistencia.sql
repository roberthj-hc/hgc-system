with source as (select * from {{ source('raw_rrhh', 'asistencia') }})
select
    id_asistencia as id_asistencia_nk,
    id_empleado as id_empleado_nk,
    id_fecha as id_fecha_nk,
    cast(hora_entrada as timestamp) as hora_entrada_real,
    cast(hora_salida as timestamp) as hora_salida_real,
    cast(minutos_atraso as integer) as minutos_atraso_entrada
from source