with source as (select * from {{ source('raw_rrhh', 'evaluaciones_desempeno') }})
select
    id_eval as id_evaluacion_nk,
    id_empleado as id_empleado_nk,
    cast(fecha as date) as fecha_evaluacion,
    cast(puntaje as numeric(5,2)) as puntaje_obtenido,
    comentarios as comentarios_evaluador
from source